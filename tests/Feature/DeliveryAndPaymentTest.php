<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\SavedOrder;
use App\Models\Service;
use App\Models\User;
use App\Support\DeliveryZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DeliveryAndPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    private function service(): Service
    {
        return Service::create(['name' => 'Wash ' . uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);
    }

    // An order form. Pass lat/lng offsets in degrees of latitude: 0.009 is roughly 1 km.
    private function payload(array $over = [], float $north = 0.0): array
    {
        return array_merge([
            'service_id' => $this->service()->id,
            'quantity' => 3,
            'fulfillment' => 'delivery',
            'address' => '12 Sample Street, Barangay One, City',
            'lat' => config('laundry.shop.lat') + $north,
            'lng' => config('laundry.shop.lng'),
            'payment_method' => 'cash',
        ], $over);
    }

    private function place(User $user, array $over = [], float $north = 0.0): Order
    {
        $this->actingAs($user)->post('/orders', $this->payload($over, $north))->assertSessionHasNoErrors();

        return Order::latest('id')->firstOrFail();
    }

    // ---------- Delivery area and fee ----------

    public function test_delivery_fee_starts_at_20_pesos_next_to_the_shop()
    {
        $order = $this->place(User::factory()->create());

        $this->assertEquals(20, $order->delivery_fee);
        $this->assertEquals(135, $order->total);
        $this->assertEquals(155, $order->amount_due);
    }

    public function test_delivery_fee_grows_with_distance()
    {
        $user = User::factory()->create();

        $this->assertEquals(40, $this->place($user, [], 0.0225)->delivery_fee);   // about 2.5 km
        $this->assertEquals(60, $this->place($user, [], 0.0405)->delivery_fee);   // about 4.5 km
    }

    public function test_far_locations_are_refused_and_no_order_is_made()
    {
        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload([], 0.1))   // about 11 km
            ->assertSessionHasErrors(['lat' => DeliveryZone::REFUSAL]);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_the_server_decides_the_fee_not_the_page()
    {
        $order = $this->place(User::factory()->create(), ['delivery_fee' => 0]);

        $this->assertEquals(20, $order->delivery_fee);
    }

    public function test_delivery_needs_a_pin_on_the_map()
    {
        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload(['lat' => null, 'lng' => null]))
            ->assertSessionHasErrors('lat');
    }

    public function test_dropoff_needs_no_address_or_pin_and_has_no_fee()
    {
        $order = $this->place(User::factory()->create(), ['fulfillment' => 'dropoff', 'address' => '', 'lat' => null, 'lng' => null]);

        $this->assertSame('dropoff', $order->fulfillment);
        $this->assertNull($order->address);
        $this->assertEquals(0, $order->delivery_fee);
        $this->assertEquals(135, $order->amount_due);
    }

    // ---------- Demo GCash ----------

    public function test_gcash_orders_go_to_the_pay_screen_and_cash_orders_do_not()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/orders', $this->payload(['payment_method' => 'gcash']));
        $gcash = Order::latest('id')->firstOrFail();
        $this->actingAs($user)->get("/orders/{$gcash->id}/pay")->assertOk();

        $cash = $this->place($user);
        $this->actingAs($user)->get("/orders/{$cash->id}/pay")->assertNotFound();
    }

    public function test_paying_with_the_right_demo_code_marks_the_order_paid()
    {
        $user = User::factory()->create();
        $order = $this->place($user, ['payment_method' => 'gcash']);

        $this->actingAs($user)
            ->post("/orders/{$order->id}/pay", ['gcash_number' => '09171234567', 'code' => config('laundry.payments.demo_code')])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/orders');

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
        $this->assertStringStartsWith('DEMO-', $order->payment_reference);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'success', 'masked_number' => '0917****567', 'method' => 'gcash']);
    }

    public function test_a_wrong_code_does_not_pay_but_the_attempt_is_logged()
    {
        $user = User::factory()->create();
        $order = $this->place($user, ['payment_method' => 'gcash']);

        $this->actingAs($user)
            ->post("/orders/{$order->id}/pay", ['gcash_number' => '09171234567', 'code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertSame('unpaid', $order->fresh()->payment_status);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'status' => 'failed']);
    }

    public function test_a_bad_gcash_number_is_rejected()
    {
        $user = User::factory()->create();
        $order = $this->place($user, ['payment_method' => 'gcash']);

        $this->actingAs($user)
            ->post("/orders/{$order->id}/pay", ['gcash_number' => '12345', 'code' => config('laundry.payments.demo_code')])
            ->assertSessionHasErrors('gcash_number');
    }

    public function test_other_customers_cannot_see_or_pay_my_order()
    {
        $owner = User::factory()->create();
        $order = $this->place($owner, ['payment_method' => 'gcash']);
        $other = User::factory()->create();

        $this->actingAs($other)->get("/orders/{$order->id}/pay")->assertNotFound();
        $this->actingAs($other)->post("/orders/{$order->id}/pay", ['gcash_number' => '09171234567', 'code' => config('laundry.payments.demo_code')])->assertNotFound();
        $this->assertSame('unpaid', $order->fresh()->payment_status);
    }

    // ---------- What the admin sees and does ----------

    public function test_admin_sees_how_it_is_handed_over_and_how_it_is_paid()
    {
        $this->place(User::factory()->create(), ['payment_method' => 'gcash']);

        $this->actingAs($this->admin())->get('/admin')->assertInertia(fn (Assert $page) => $page
            ->where('orders.0.fulfillment', 'delivery')
            ->where('orders.0.payment_method', 'gcash')
            ->where('orders.0.payment_status', 'unpaid')
            ->where('stats.awaitingGcash', 1));
    }

    public function test_cash_is_marked_paid_when_the_order_is_claimed()
    {
        $order = $this->place(User::factory()->create());

        $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}", ['status' => 'Completed'])->assertSessionHasNoErrors();

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id, 'method' => 'cash', 'status' => 'success']);
    }

    public function test_admin_can_mark_cash_paid_but_not_gcash()
    {
        $cash = $this->place(User::factory()->create());
        $gcash = $this->place(User::factory()->create(), ['payment_method' => 'gcash']);
        $admin = $this->admin();

        $this->actingAs($admin)->patch("/admin/orders/{$cash->id}/paid")->assertSessionHasNoErrors();
        $this->assertSame('paid', $cash->fresh()->payment_status);

        $this->actingAs($admin)->patch("/admin/orders/{$gcash->id}/paid")->assertSessionHasErrors('payment');
        $this->assertSame('unpaid', $gcash->fresh()->payment_status);
    }

    public function test_customers_cannot_mark_orders_paid()
    {
        $user = User::factory()->create();
        $order = $this->place($user);

        $this->actingAs($user)->patch("/admin/orders/{$order->id}/paid")->assertForbidden();
        $this->assertSame('unpaid', $order->fresh()->payment_status);
    }

    // ---------- Saved orders: most recently used first ----------

    public function test_saved_orders_are_listed_most_recently_used_first()
    {
        $user = User::factory()->create();
        $service = $this->service();
        $make = fn (string $name, $when) => SavedOrder::create([
            'user_id' => $user->id, 'name' => $name, 'service_id' => $service->id, 'quantity' => 1,
            'address' => '12 Sample Street, Barangay One, City', 'last_used_at' => $when,
        ]);

        $make('Alpha', now()->subDays(5));
        $make('Zulu', now()->subDays(1));
        $make('Never used', null);

        $this->actingAs($user)->get('/orders/create')->assertInertia(fn (Assert $page) => $page
            ->where('saved.0.name', 'Zulu')
            ->where('saved.1.name', 'Alpha')
            ->where('saved.2.name', 'Never used'));
    }

    public function test_ordering_from_a_saved_order_moves_it_to_the_front()
    {
        $user = User::factory()->create();
        $service = $this->service();
        $old = SavedOrder::create(['user_id' => $user->id, 'name' => 'Alpha', 'service_id' => $service->id, 'quantity' => 1, 'address' => '12 Sample Street, Barangay One, City', 'last_used_at' => now()->subDays(9)]);
        SavedOrder::create(['user_id' => $user->id, 'name' => 'Zulu', 'service_id' => $service->id, 'quantity' => 1, 'address' => '12 Sample Street, Barangay One, City', 'last_used_at' => now()->subDay()]);

        $this->place($user, ['service_id' => $service->id, 'saved_order_id' => $old->id]);

        $this->actingAs($user)->get('/orders/create')->assertInertia(fn (Assert $page) => $page->where('saved.0.name', 'Alpha'));
    }

    public function test_a_saved_order_remembers_the_pin_and_how_it_is_handed_over()
    {
        $user = User::factory()->create();
        $this->place($user, ['save_as' => 'Usual']);

        $this->assertDatabaseHas('saved_orders', ['user_id' => $user->id, 'name' => 'Usual', 'fulfillment' => 'delivery']);
        $this->actingAs($user)->get('/orders/create')->assertInertia(fn (Assert $page) => $page
            ->where('saved.0.fulfillment', 'delivery')
            ->has('saved.0.lat'));
    }
}
