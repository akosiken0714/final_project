<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\SavedOrder;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LaundryTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    private function service(bool $active = true): Service
    {
        return Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => $active]);
    }

    private function payload(array $over = []): array
    {
        return array_merge([
            'service_id' => $this->service()->id,
            'quantity' => 3,
            'address' => '12 Sample Street, Barangay One, City',
            // a pin right at the shop, so it is always inside the delivery area
            'lat' => config('laundry.shop.lat'),
            'lng' => config('laundry.shop.lng'),
        ], $over);
    }

    public function test_guests_cannot_open_admin()
    {
        $this->get('/admin')->assertRedirect('/login');
    }

    public function test_customers_cannot_open_admin()
    {
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
    }

    public function test_admin_without_2fa_is_sent_to_security_settings()
    {
        // The 2FA rule only applies in production, so pretend we're in production here.
        $this->app->detectEnvironment(fn () => 'production');

        $this->actingAs(User::factory()->create(['role' => 'admin']))
            ->get('/admin')
            ->assertRedirect('/settings/security');
    }

    public function test_admin_with_2fa_can_open_admin()
    {
        $this->actingAs($this->admin())->get('/admin')->assertOk();
    }

    public function test_customer_cannot_change_order_status()
    {
        $order = Order::create(['user_id' => User::factory()->create()->id, 'service_id' => $this->service()->id, 'quantity' => 1, 'total' => 45]);
        $this->actingAs(User::factory()->create())->patch("/admin/orders/{$order->id}", ['status' => 'Completed'])->assertForbidden();
    }

    public function test_hidden_services_cannot_be_ordered()
    {
        $hidden = $this->service(false);
        $this->actingAs(User::factory()->create())->post('/orders', $this->payload(['service_id' => $hidden->id]))
            ->assertSessionHasErrors('service_id');
    }

    public function test_quantity_must_be_a_whole_number()
    {
        $this->actingAs(User::factory()->create())->post('/orders', $this->payload(['quantity' => 1.5]))
            ->assertSessionHasErrors('quantity');
    }

    public function test_address_is_required()
    {
        $this->actingAs(User::factory()->create())->post('/orders', $this->payload(['address' => '']))
            ->assertSessionHasErrors('address');
    }

    public function test_valid_order_is_created()
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/orders', $this->payload())->assertRedirect('/orders');
        $this->assertDatabaseHas('orders', ['user_id' => $user->id, 'total' => 135]);
    }

    public function test_non_images_are_rejected()
    {
        Storage::fake('local');
        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload(['photo' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'), 'photo_confirmed' => 1]))
            ->assertSessionHasErrors('photo');
    }

    public function test_photo_needs_confirmation()
    {
        Storage::fake('local');
        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload(['photo' => UploadedFile::fake()->image('a.jpg')]))
            ->assertSessionHasErrors('photo_confirmed');
    }

    public function test_photos_are_private_to_owner_and_admin()
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/orders', $this->payload(['photo' => UploadedFile::fake()->image('a.jpg', 800, 600), 'photo_confirmed' => 1]));
        $order = Order::firstOrFail();
        Storage::disk('local')->assertExists($order->photo);

        $this->actingAs($owner)->get("/orders/{$order->id}/photo")->assertOk();
        $this->actingAs($this->admin())->get("/orders/{$order->id}/photo")->assertOk();
        $this->actingAs(User::factory()->create())->get("/orders/{$order->id}/photo")->assertNotFound();
    }

    public function test_completed_orders_cannot_be_reopened()
    {
        $order = Order::create(['user_id' => User::factory()->create()->id, 'service_id' => $this->service()->id, 'quantity' => 1, 'total' => 45, 'status' => 'Completed']);
        $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}", ['status' => 'Pending'])->assertSessionHasErrors('status');
        $this->assertSame('Completed', $order->fresh()->status);
    }

    public function test_last_admin_cannot_be_deleted()
    {
        $admin = $this->admin();
        $this->actingAs($admin)->delete('/settings/profile', ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertNotSoftDeleted($admin);
    }

    private function orderFor(User $user, string $status = 'Completed', float $total = 100.5): Order
    {
        return Order::create(['user_id' => $user->id, 'service_id' => $this->service()->id, 'quantity' => 1, 'total' => $total, 'status' => $status]);
    }

    private function savedPayload(array $over = []): array
    {
        return array_merge([
            'name' => 'Weekly wash',
            'service_id' => $this->service()->id,
            'quantity' => 3,
            'address' => '12 Sample Street, Barangay One, City',
            'instructions' => 'No bleach',
        ], $over);
    }

    private function fillSavedList(User $user): void
    {
        $service = $this->service();
        for ($i = 1; $i <= SavedOrder::MAX_PER_USER; $i++) {
            SavedOrder::create([
                'user_id' => $user->id,
                'name' => "Saved {$i}",
                'service_id' => $service->id,
                'quantity' => 1,
                'address' => '12 Sample Street, Barangay One, City',
            ]);
        }
    }

    // ---------- Ongoing / Finished ----------

    public function test_orders_are_split_into_ongoing_and_finished()
    {
        $customer = User::factory()->create();
        $this->orderFor($customer, 'Pending');
        $this->orderFor($customer, 'In Progress');
        $this->orderFor($customer, 'Ready for Pickup');
        $this->orderFor($customer, 'Completed');

        $this->actingAs($customer)->get('/orders')
            ->assertInertia(fn (Assert $page) => $page
                ->where('view', 'ongoing')
                ->has('orders', 2)
                ->where('counts.ongoing', 2)
                ->where('counts.finished', 2)
                ->where('counts.ready', 1)
                ->where('counts.claimed', 1));

        // Ready orders come first, then the claimed log.
        $this->actingAs($customer)->get('/orders?view=finished')
            ->assertInertia(fn (Assert $page) => $page
                ->has('orders', 2)
                ->where('orders.0.status', 'Ready for Pickup')
                ->where('orders.1.status', 'Completed'));
    }

    public function test_claimed_log_loads_a_page_at_a_time_but_ready_orders_always_show()
    {
        $customer = User::factory()->create();
        for ($i = 0; $i < 12; $i++) {
            $this->orderFor($customer, 'Completed');
        }
        $this->orderFor($customer, 'Ready for Pickup');

        $this->actingAs($customer)->get('/orders?view=finished')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 11)->where('hasMore', true)->where('orders.0.status', 'Ready for Pickup'));

        $this->actingAs($customer)->get('/orders?view=finished&limit=20')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 13)->where('hasMore', false));
    }

    public function test_customers_only_see_their_own_orders()
    {
        $mine = User::factory()->create();
        $this->orderFor($mine, 'Pending');
        $this->orderFor(User::factory()->create(), 'Pending');

        $this->actingAs($mine)->get('/orders')->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('counts.ongoing', 1));
    }

    public function test_totals_do_not_depend_on_which_tab_is_open()
    {
        $customer = User::factory()->create();
        $this->orderFor($customer, 'Completed', 100.5);
        $this->orderFor($customer, 'Completed', 50.25);
        $this->orderFor($customer, 'Pending', 10);

        foreach (['/orders', '/orders?view=finished'] as $url) {
            $this->actingAs($customer)->get($url)
                ->assertInertia(fn (Assert $page) => $page->where('stats.spent', 150.75)->where('stats.orders', 3));
        }

        foreach (['/admin', '/admin?view=finished'] as $url) {
            $this->actingAs($this->admin())->get($url)
                ->assertInertia(fn (Assert $page) => $page->where('stats.revenue', 150.75)->where('stats.total', 3));
        }
    }

    public function test_unknown_view_falls_back_to_ongoing()
    {
        $customer = User::factory()->create();
        $this->orderFor($customer, 'Pending');
        $this->orderFor($customer, 'Completed');

        $this->actingAs($customer)->get('/orders?view=archived')
            ->assertInertia(fn (Assert $page) => $page->where('view', 'ongoing')->has('orders', 1));
    }

    // ---------- Saved orders ----------

    public function test_customer_can_save_an_order_and_it_is_private()
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload())->assertSessionHasNoErrors();

        $this->assertDatabaseHas('saved_orders', ['user_id' => $owner->id, 'name' => 'Weekly wash', 'quantity' => 3]);

        $this->actingAs($owner)->get('/orders/create')->assertInertia(fn (Assert $page) => $page->has('saved', 1)->where('saved.0.name', 'Weekly wash')->where('saved.0.available', true));
        $this->actingAs(User::factory()->create())->get('/orders/create')->assertInertia(fn (Assert $page) => $page->has('saved', 0));
    }

    public function test_saving_with_an_existing_name_updates_it_instead_of_duplicating()
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['quantity' => 3]));
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['name' => 'WEEKLY WASH', 'quantity' => 5]))->assertSessionHasNoErrors();

        $this->assertSame(1, SavedOrder::where('user_id', $owner->id)->count());
        $this->assertDatabaseHas('saved_orders', ['user_id' => $owner->id, 'quantity' => 5]);
    }

    public function test_saved_orders_need_a_real_available_service()
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['service_id' => $this->service(false)->id]))->assertSessionHasErrors('service_id');
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['name' => '']))->assertSessionHasErrors('name');
        $this->assertDatabaseCount('saved_orders', 0);
    }

    public function test_saved_order_limit_blocks_new_names_but_not_updates()
    {
        $owner = User::factory()->create();
        $this->fillSavedList($owner);

        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['name' => 'One too many']))->assertSessionHasErrors('name');
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['name' => 'Saved 1', 'quantity' => 9]))->assertSessionHasNoErrors();

        $this->assertDatabaseCount('saved_orders', SavedOrder::MAX_PER_USER);
        $this->assertDatabaseHas('saved_orders', ['user_id' => $owner->id, 'name' => 'Saved 1', 'quantity' => 9]);
    }

    public function test_customer_can_delete_only_their_own_saved_order()
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload());
        $saved = SavedOrder::firstOrFail();

        $this->actingAs(User::factory()->create())->delete("/saved-orders/{$saved->id}")->assertNotFound();
        $this->assertDatabaseCount('saved_orders', 1);

        $this->actingAs($owner)->delete("/saved-orders/{$saved->id}")->assertSessionHasNoErrors();
        $this->assertDatabaseCount('saved_orders', 0);
    }

    public function test_guests_cannot_use_saved_orders()
    {
        $this->post('/saved-orders', $this->savedPayload())->assertRedirect('/login');
    }

    public function test_placing_an_order_can_also_save_it()
    {
        $customer = User::factory()->create();
        $this->actingAs($customer)->post('/orders', $this->payload(['save_as' => 'Usual']))->assertSessionHasNoErrors();

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('saved_orders', ['user_id' => $customer->id, 'name' => 'Usual']);
    }

    public function test_full_saved_list_blocks_the_order_before_it_is_placed()
    {
        $customer = User::factory()->create();
        $this->fillSavedList($customer);

        $this->actingAs($customer)->post('/orders', $this->payload(['save_as' => 'Brand new']))->assertSessionHasErrors('save_as');
        $this->assertDatabaseCount('orders', 0);

        // Reusing an existing name is still fine when the list is full.
        $this->actingAs($customer)->post('/orders', $this->payload(['save_as' => 'saved 2']))->assertSessionHasNoErrors();
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_saved_order_flags_a_service_that_is_no_longer_available()
    {
        $owner = User::factory()->create();
        $service = $this->service();
        $this->actingAs($owner)->post('/saved-orders', $this->savedPayload(['service_id' => $service->id]));
        $service->update(['active' => false]);

        $this->actingAs($owner)->get('/orders/create')->assertInertia(fn (Assert $page) => $page->where('saved.0.available', false));
    }
}
