<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WalkInOrderTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        return User::factory()->create(['role' => 'staff']);
    }

    private function service(array $over = []): Service
    {
        return Service::create(array_merge(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true], $over));
    }

    // The smallest valid walk-in for a NEW customer.
    private function newCustomerPayload(Service $service, array $over = []): array
    {
        return array_merge([
            'name' => 'Maria Dela Cruz',
            'phone' => '0917 123 4567',
            'service_id' => $service->id,
            'quantity' => 4.6,
        ], $over);
    }

    public function test_the_walk_in_page_lists_the_active_services(): void
    {
        $this->service(['name' => 'Wash A']);
        $this->service(['name' => 'Old one', 'active' => false]);

        $this->actingAs($this->staff())->get('/admin/walk-in')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/WalkIn')->has('services', 1)->where('matches', []));
    }

    public function test_searching_finds_existing_customers_only(): void
    {
        User::factory()->create(['name' => 'Maria Santos', 'phone' => '09170000001']);
        User::factory()->create(['name' => 'Pedro Reyes']);
        User::factory()->create(['name' => 'Maria Admin', 'role' => 'admin']);

        $this->actingAs($this->staff())->get('/admin/walk-in?q=Maria')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('matches', 1)->where('matches.0.name', 'Maria Santos'));

        // one letter is too short to search
        $this->actingAs($this->staff())->get('/admin/walk-in?q=M')
            ->assertInertia(fn (Assert $page) => $page->where('matches', []));
    }

    public function test_a_new_walk_in_customer_and_order_are_created_with_the_real_weight(): void
    {
        $staff = $this->staff();
        $service = $this->service();

        $response = $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service, ['instructions' => 'No softener']));

        $response->assertSessionHasNoErrors();

        $customer = User::where('name', 'Maria Dela Cruz')->firstOrFail();
        $this->assertNull($customer->email);
        $this->assertSame('09171234567', $customer->phone);
        $this->assertSame('customer', $customer->role);

        $order = Order::where('user_id', $customer->id)->firstOrFail();
        $response->assertRedirect("/orders/{$order->id}/receipt");
        $this->assertSame(Order::WALK_IN, $order->source);
        $this->assertSame($staff->id, (int) $order->created_by);
        $this->assertSame(Order::DROPOFF, $order->fulfillment);
        $this->assertSame(Order::CASH, $order->payment_method);
        $this->assertSame(Order::UNPAID, $order->payment_status);
        $this->assertSame('Pending', $order->status);
        $this->assertEquals(4.6, (float) $order->quantity);
        $this->assertEquals(207.0, (float) $order->total);
        $this->assertNull($order->estimated_quantity);
        $this->assertNull($order->address);
        $this->assertSame('No softener', $order->instructions);
        $this->assertDatabaseHas('activity_logs', ['event' => 'order.placed', 'order_id' => $order->id]);

        // no login, so no bell message either
        $this->assertDatabaseMissing('notifications', ['notifiable_id' => $customer->id]);
    }

    public function test_a_walk_in_order_can_be_given_to_an_existing_customer_who_is_told(): void
    {
        $customer = User::factory()->create(['phone' => '09179998888']);
        $service = $this->service();

        $this->actingAs($this->staff())->post('/admin/walk-in', [
            'customer_id' => $customer->id,
            'service_id' => $service->id,
            'quantity' => 3,
        ])->assertSessionHasNoErrors();

        $order = Order::where('user_id', $customer->id)->firstOrFail();
        $this->assertSame(Order::WALK_IN, $order->source);
        $this->assertSame(1, User::where('phone', '09179998888')->count());
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $customer->id]);
    }

    public function test_paying_now_records_the_cash_payment(): void
    {
        $service = $this->service();

        $this->actingAs($this->staff())->post('/admin/walk-in', $this->newCustomerPayload($service, ['paid_now' => true]))
            ->assertSessionHasNoErrors();

        $order = Order::firstOrFail();
        $this->assertTrue($order->isPaid());
        $this->assertNotNull($order->paid_at);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'method' => 'cash', 'status' => 'success']);
        $this->assertDatabaseHas('activity_logs', ['event' => 'payment.cash', 'order_id' => $order->id]);
    }

    public function test_bad_amounts_are_refused_and_nothing_is_saved(): void
    {
        $service = $this->service();
        $staff = $this->staff();

        foreach ([0, -1, 500, 'abc', 1.234, ''] as $bad) {
            $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service, ['quantity' => $bad]))
                ->assertSessionHasErrors('quantity');
        }

        $this->assertSame(0, Order::count());
        $this->assertDatabaseMissing('users', ['name' => 'Maria Dela Cruz']);
    }

    public function test_the_service_must_exist_and_be_active(): void
    {
        $off = $this->service(['active' => false]);
        $staff = $this->staff();

        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($off))->assertSessionHasErrors('service_id');
        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($off, ['service_id' => 9999]))->assertSessionHasErrors('service_id');
        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($off, ['service_id' => null]))->assertSessionHasErrors('service_id');

        $this->assertSame(0, Order::count());
    }

    public function test_a_new_customer_needs_a_proper_name_and_a_philippine_phone(): void
    {
        $service = $this->service();
        $staff = $this->staff();

        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service, ['name' => '']))->assertSessionHasErrors('name');
        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service, ['name' => '12345']))->assertSessionHasErrors('name');
        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service, ['phone' => '']))->assertSessionHasErrors('phone');
        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service, ['phone' => '12345']))->assertSessionHasErrors('phone');

        $this->assertSame(0, Order::count());
    }

    public function test_a_phone_that_already_belongs_to_a_customer_is_refused_with_their_name(): void
    {
        User::factory()->create(['name' => 'Juan Existing', 'phone' => '09171234567']);
        $service = $this->service();

        $response = $this->actingAs($this->staff())->post('/admin/walk-in', $this->newCustomerPayload($service));

        $response->assertSessionHasErrors('phone');
        $this->assertStringContainsString('Juan Existing', session('errors')->get('phone')[0]);
        $this->assertSame(0, Order::count());
    }

    public function test_the_chosen_customer_must_be_a_real_customer_account(): void
    {
        $service = $this->service();
        $staff = $this->staff();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($staff)->post('/admin/walk-in', ['customer_id' => $admin->id, 'service_id' => $service->id, 'quantity' => 2])
            ->assertSessionHasErrors('customer_id');
        $this->actingAs($staff)->post('/admin/walk-in', ['customer_id' => $staff->id, 'service_id' => $service->id, 'quantity' => 2])
            ->assertSessionHasErrors('customer_id');
        $this->actingAs($staff)->post('/admin/walk-in', ['customer_id' => 9999, 'service_id' => $service->id, 'quantity' => 2])
            ->assertSessionHasErrors('customer_id');

        $this->assertSame(0, Order::count());
    }

    public function test_the_intake_record_can_be_taken_in_the_same_step(): void
    {
        $service = $this->service();

        $this->actingAs($this->staff())->post('/admin/walk-in', $this->newCustomerPayload($service, [
            'item_count' => 12,
            'intake_notes' => '1 white shirt, small stain on the collar',
        ]))->assertSessionHasNoErrors();

        $order = Order::firstOrFail();
        $this->assertDatabaseHas('order_intakes', [
            'order_id' => $order->id,
            'item_count' => 12,
            'notes' => '1 white shirt, small stain on the collar',
        ]);
    }

    public function test_a_counter_photo_needs_an_item_count(): void
    {
        Storage::fake('local');
        $service = $this->service();

        $this->actingAs($this->staff())->post('/admin/walk-in', $this->newCustomerPayload($service, [
            'photo' => UploadedFile::fake()->image('bag.jpg', 600, 400),
        ]))->assertSessionHasErrors('item_count');

        $this->assertSame(0, Order::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_counter_photo_is_stored_with_the_intake_record(): void
    {
        Storage::fake('local');
        $service = $this->service();

        $this->actingAs($this->staff())->post('/admin/walk-in', $this->newCustomerPayload($service, [
            'item_count' => 5,
            'photo' => UploadedFile::fake()->image('bag.jpg', 600, 400),
        ]))->assertSessionHasNoErrors();

        $intake = Order::firstOrFail()->intake;
        $this->assertNotNull($intake->photo);
        Storage::disk('local')->assertExists($intake->photo);
    }

    public function test_a_walk_in_order_moves_through_the_desk_like_any_other(): void
    {
        $service = $this->service();
        $staff = $this->staff();

        $this->actingAs($staff)->post('/admin/walk-in', $this->newCustomerPayload($service))->assertSessionHasNoErrors();
        $order = Order::firstOrFail();

        $this->actingAs($staff)->patch("/admin/orders/{$order->id}", ['status' => 'In Progress'])->assertSessionHasNoErrors();
        $this->actingAs($staff)->patch("/admin/orders/{$order->id}", ['status' => 'Ready for Pickup'])->assertSessionHasNoErrors();
        $this->actingAs($staff)->patch("/admin/orders/{$order->id}", ['status' => 'Completed'])->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame('Completed', $order->status);
        // cash is recorded automatically when the order is claimed
        $this->assertTrue($order->isPaid());
    }

    public function test_online_orders_keep_the_online_source(): void
    {
        $customer = User::factory()->create();
        $service = $this->service();

        $order = Order::create([
            'user_id' => $customer->id,
            'service_id' => $service->id,
            'quantity' => 2,
            'total' => 90,
            'fulfillment' => Order::DROPOFF,
        ]);

        $this->assertSame(Order::ONLINE, $order->fresh()->source);
        $this->assertFalse($order->fresh()->isWalkIn());
    }

    public function test_the_admin_dashboard_flags_walk_in_orders(): void
    {
        $service = $this->service();
        $admin = User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->post('/admin/walk-in', $this->newCustomerPayload($service))->assertSessionHasNoErrors();

        $this->actingAs($admin)->get('/admin')
            ->assertInertia(fn (Assert $page) => $page->where('orders.0.source', 'walk_in'));
    }
}
