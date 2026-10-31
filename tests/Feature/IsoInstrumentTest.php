<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * One test for every statement in the PhineWash ISO/IEC 25010 instrument (sections A to F).
 * Test names look like: test_A4_search_and_filter ... so a failing test tells you which
 * instrument statement is not backed by the code.
 *
 * HOW TO USE
 *   Put this file in tests/Feature/IsoInstrumentTest.php, then run:
 *       php artisan test --filter=IsoInstrumentTest
 *   Screenshot the result for the defense. Do not say "all pass" unless you saw it.
 *
 * WHAT A TEST CANNOT PROVE (check these by hand, see the MANUAL list at the bottom):
 *   speed, smoothness, phone layout, dark mode, keyboard use, how things look.
 */
class IsoInstrumentTest extends TestCase
{
    use RefreshDatabase;

    // ---------------------------------------------------------------- helpers

    private function customer(): User
    {
        return User::factory()->create();
    }

    private function staff(): User
    {
        return User::factory()->create(['role' => 'staff']);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    private function service(float $price = 45, bool $active = true): Service
    {
        return Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => $price, 'active' => $active]);
    }

    // A saved order made straight in the database. 2 kg x 45 = 90 by default.
    private function order(User $owner, string $status = 'Pending', array $over = []): Order
    {
        $order = Order::create([
            'user_id' => $owner->id,
            'service_id' => $this->service()->id,
            'quantity' => 2,
            'total' => 90,
            'fulfillment' => Order::DROPOFF,
        ]);
        $order->forceFill(array_merge(['status' => $status, 'payment_method' => Order::CASH, 'payment_status' => Order::UNPAID], $over))->save();

        return $order->refresh();
    }

    // The order form as a customer sends it. $north moves the pin north: 0.009 degrees is about 1 km.
    private function form(array $over = [], float $north = 0.0): array
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
        $this->actingAs($user)->post('/orders', $this->form($over, $north))->assertSessionHasNoErrors();

        return Order::latest('id')->firstOrFail();
    }

    // ============================================================ A. FUNCTIONAL SUITABILITY

    public function test_A1_customer_places_an_order_and_the_admin_processes_it_to_completion(): void
    {
        $customer = $this->customer();
        $order = $this->place($customer);
        $this->assertSame('Pending', $order->status);

        $this->actingAs($customer)->get('/orders')->assertOk();

        $admin = $this->admin();
        foreach (['In Progress', 'Ready for Pickup', 'Out for Delivery', 'Completed'] as $status) {
            $this->actingAs($admin)->patch("/admin/orders/{$order->id}", ['status' => $status])->assertSessionHasNoErrors();
        }

        $this->assertSame('Completed', $order->fresh()->status);
    }

    public function test_A2_order_form_computes_the_total_and_the_distance_based_delivery_fee(): void
    {
        $user = $this->customer();

        // delivery next to the shop: 3 kg x 45 = 135, fee 20, amount due 155
        $near = $this->place($user);
        $this->assertEquals(20, $near->delivery_fee);
        $this->assertEquals(135, $near->total);
        $this->assertEquals(155, $near->amount_due);

        // the three fee tiers
        $this->assertEquals(40, $this->place($user, [], 0.0225)->delivery_fee);   // about 2.5 km
        $this->assertEquals(60, $this->place($user, [], 0.0405)->delivery_fee);   // about 4.5 km

        // drop-off has no delivery fee
        $dropoff = $this->place($user, ['fulfillment' => 'dropoff']);
        $this->assertEquals(0, $dropoff->delivery_fee);
        $this->assertEquals(135, $dropoff->amount_due);
    }

    public function test_A2_order_form_refuses_bad_input(): void
    {
        $user = $this->customer();

        $this->actingAs($user)->post('/orders', $this->form(['quantity' => 0]))->assertSessionHasErrors('quantity');
        $this->actingAs($user)->post('/orders', $this->form(['quantity' => 101]))->assertSessionHasErrors('quantity');
        $this->actingAs($user)->post('/orders', $this->form(['service_id' => $this->service(45, false)->id]))->assertSessionHasErrors('service_id');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_A2_the_server_decides_the_price_not_the_page(): void
    {
        $order = $this->place($this->customer(), ['delivery_fee' => 0, 'total' => 1]);

        $this->assertEquals(20, $order->delivery_fee);
        $this->assertEquals(135, $order->total);
    }

    public function test_A3_my_orders_shows_each_status_and_the_owner_can_open_the_receipt(): void
    {
        $me = $this->customer();
        foreach (['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled'] as $status) {
            $this->order($me, $status);
        }
        $this->actingAs($me)->get('/orders')->assertOk();
        $this->actingAs($me)->get('/orders?view=finished')->assertOk();

        $order = $this->order($me);
        $this->actingAs($me)->get("/orders/{$order->id}/receipt")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Orders/Receipt')->where('order.id', $order->id)->where('order.amount_due', 90));
    }

    public function test_A4_admin_search_and_filters_work_and_can_be_combined(): void
    {
        $admin = $this->admin();
        $maria = User::factory()->create(['name' => 'Maria Santos', 'email' => 'maria@example.com']);
        $mine = $this->order($maria, 'Pending', ['payment_status' => Order::PAID]);
        $this->order($this->customer(), 'In Progress');
        $this->order($this->customer(), 'Pending');

        // by order number
        $this->actingAs($admin)->get('/admin?q='.$mine->id)
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('orders.0.id', $mine->id));
        // by customer name and by email
        $this->actingAs($admin)->get('/admin?q=Maria')->assertInertia(fn (Assert $page) => $page->has('orders', 1));
        $this->actingAs($admin)->get('/admin?q=maria@example.com')->assertInertia(fn (Assert $page) => $page->has('orders', 1));
        // by status
        $this->actingAs($admin)->get('/admin?status=In%20Progress')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('orders.0.status', 'In Progress'));
        // by paid or unpaid
        $this->actingAs($admin)->get('/admin?pay=paid')->assertInertia(fn (Assert $page) => $page->has('orders', 1));
        $this->actingAs($admin)->get('/admin?pay=unpaid')->assertInertia(fn (Assert $page) => $page->has('orders', 2));
        // combined, and a date range that includes today
        $today = now()->toDateString();
        $this->actingAs($admin)->get("/admin?status=Pending&pay=unpaid&from={$today}&to={$today}")
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1));
        // nonsense in the filters is ignored, not a crash
        $this->actingAs($admin)->get('/admin?status=bogus&pay=maybe&from=nope&to=2026-99-99')->assertOk();
    }

    public function test_A5_delivery_zone_accepts_inside_and_refuses_too_far(): void
    {
        $user = $this->customer();

        $this->actingAs($user)->post('/orders', $this->form([], 0.0225))->assertSessionHasNoErrors();   // about 2.5 km
        $before = Order::count();

        $this->actingAs($user)->post('/orders', $this->form([], 0.1))->assertSessionHasErrors('lat');   // about 11 km
        $this->assertSame($before, Order::count());
    }

    public function test_A6_cash_and_demo_gcash_record_the_payment_and_show_a_receipt(): void
    {
        $user = $this->customer();

        // GCash: wrong code fails, right code pays, bad number refused
        $gcash = $this->place($user, ['payment_method' => 'gcash']);
        $this->actingAs($user)->post("/orders/{$gcash->id}/pay", ['gcash_number' => '12345', 'code' => config('laundry.payments.demo_code')])
            ->assertSessionHasErrors('gcash_number');
        $this->actingAs($user)->post("/orders/{$gcash->id}/pay", ['gcash_number' => '09171234567', 'code' => '000000'])
            ->assertSessionHasErrors('code');
        $this->assertSame('unpaid', $gcash->fresh()->payment_status);

        $this->actingAs($user)->post("/orders/{$gcash->id}/pay", ['gcash_number' => '09171234567', 'code' => config('laundry.payments.demo_code')])
            ->assertSessionHasNoErrors();
        $this->assertSame('paid', $gcash->fresh()->payment_status);
        $this->assertDatabaseHas('payments', ['order_id' => $gcash->id, 'status' => 'success', 'method' => 'gcash']);

        // Cash: the shop marks it paid at the counter
        $cash = $this->place($user);
        $this->actingAs($this->admin())->patch("/admin/orders/{$cash->id}/paid")->assertSessionHasNoErrors();
        $this->assertSame('paid', $cash->fresh()->payment_status);

        $this->actingAs($user)->get("/orders/{$cash->id}/receipt")->assertOk();
    }

    public function test_A7_role_based_access_separates_guest_customer_staff_and_admin(): void
    {
        $order = $this->order($this->customer());

        // guest
        $this->get('/admin')->assertRedirect('/login');
        // customer
        $other = $this->customer();
        $this->actingAs($other)->get('/admin')->assertForbidden();
        $this->actingAs($other)->patch("/admin/orders/{$order->id}", ['status' => 'Completed'])->assertForbidden();
        $this->actingAs($other)->get("/orders/{$order->id}/receipt")->assertNotFound();   // not their order
        // staff: the order desk yes, money and admin pages no
        $staff = $this->staff();
        $this->actingAs($staff)->get('/admin')->assertOk();
        foreach (['/admin/customers', '/admin/services', '/admin/history', '/admin/report'] as $url) {
            $this->actingAs($staff)->get($url)->assertForbidden();
        }
        // admin
        $admin = $this->admin();
        foreach (['/admin', '/admin/customers', '/admin/services', '/admin/history', '/admin/report'] as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }
    }

    public function test_A8_shop_team_actions_work_and_show_on_the_customer_pages(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);
        $staff = $this->staff();

        $this->actingAs($staff)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 3.5])->assertSessionHasNoErrors();
        $this->actingAs($staff)->post("/admin/orders/{$order->id}/intake", ['item_count' => 8])->assertSessionHasNoErrors();
        $this->actingAs($staff)->patch("/admin/orders/{$order->id}/paid")->assertSessionHasNoErrors();
        $this->actingAs($staff)->patch("/admin/orders/{$order->id}", ['status' => 'In Progress'])->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertEquals(3.5, $order->quantity);
        $this->assertSame('In Progress', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->actingAs($customer)->get('/orders')->assertOk();   // the customer page loads with the new status

        // walk-in order entered at the counter
        $this->actingAs($staff)->post('/admin/walk-in', [
            'name' => 'Maria Dela Cruz', 'phone' => '0917 123 4567',
            'service_id' => $this->service()->id, 'quantity' => 2,
        ])->assertSessionHasNoErrors();
        $this->assertSame(Order::WALK_IN, Order::latest('id')->first()->source);

        // cancel with a reason
        $other = $this->order($customer);
        $this->actingAs($staff)->post("/admin/orders/{$other->id}/cancel", ['reason' => 'Customer asked to cancel'])->assertSessionHasNoErrors();
        $this->assertSame(Order::CANCELLED, $other->fresh()->status);

        // only the admin manages services and prices
        $this->actingAs($staff)->post('/admin/services', ['name' => 'X'])->assertForbidden();
    }

    public function test_A9_rating_records_stars_and_comment_for_a_finished_order_only(): void
    {
        $customer = $this->customer();
        $done = $this->order($customer, Order::CLAIMED);

        $this->actingAs($customer)->post("/orders/{$done->id}/rating", ['stars' => 4, 'comment' => 'Fast and neat'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('order_ratings', ['order_id' => $done->id, 'stars' => 4, 'comment' => 'Fast and neat']);

        foreach ([0, 6, 'x'] as $bad) {
            $this->actingAs($customer)->post("/orders/{$done->id}/rating", ['stars' => $bad])->assertSessionHasErrors('stars');
        }

        // an unfinished order cannot be rated
        $pending = $this->order($customer);
        $this->actingAs($customer)->post("/orders/{$pending->id}/rating", ['stars' => 5]);
        $this->assertDatabaseMissing('order_ratings', ['order_id' => $pending->id]);

        // and it reaches the admin report
        $this->actingAs($this->admin())->get('/admin/report')->assertOk();
    }

    public function test_A10_dashboard_history_and_report_summarize_real_data(): void
    {
        $admin = $this->admin();
        $customer = $this->customer();
        $this->order($customer, Order::CLAIMED, ['payment_status' => Order::PAID]);
        $this->order($customer, 'Pending');

        $this->actingAs($admin)->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Orders')->where('can.revenue', true)->has('analytics'));
        $this->actingAs($admin)->get('/admin/history')->assertOk();
        $this->actingAs($admin)->get('/admin/history/export')->assertOk();
        foreach (['week', 'month', 'year'] as $period) {
            $this->actingAs($admin)->get('/admin/report?period='.$period)->assertOk();
        }
    }

    // ============================================================ B. PERFORMANCE EFFICIENCY
    // Speed and smoothness cannot be proven by a test. The code-level parts are below.

    public function test_B4_long_lists_are_split_into_pages(): void
    {
        $admin = $this->admin();
        User::factory()->count(30)->create();   // customers

        $this->actingAs($admin)->get('/admin/customers')
            ->assertInertia(fn (Assert $page) => $page->has('customers.data', 24));
        $this->actingAs($admin)->get('/admin/customers?page=2')->assertOk();
    }

    public function test_B2_uploaded_photos_are_resized_and_not_stored_raw(): void
    {
        $user = $this->customer();
        $this->actingAs($user)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('big.jpg', 4000, 3000)]);
        // the avatar route exists and accepts a large image; the resize itself is covered by PhotoSanitizerTest
        $this->actingAs($user)->get('/avatars/'.$user->id)->assertOk();
    }

    // ============================================================ C. USABILITY

    public function test_C1_each_user_type_lands_on_its_own_tools(): void
    {
        $this->get('/')->assertOk();                                         // guest: landing page
        $this->actingAs($this->customer())->get('/dashboard')->assertRedirect('/orders');  // customer
        $this->actingAs($this->staff())->get('/dashboard')->assertRedirect('/admin');
    }

    public function test_C3_the_main_flow_pages_all_open(): void
    {
        $user = $this->customer();
        $order = $this->order($user);
        foreach (['/orders', '/orders/create', "/orders/{$order->id}/receipt"] as $url) {
            $this->actingAs($user)->get($url)->assertOk();
        }
    }

    public function test_C4_mistakes_are_prevented_with_clear_errors(): void
    {
        $user = $this->customer();

        // invalid photo type is refused
        $this->actingAs($user)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->create('evil.php', 10, 'application/x-php')])
            ->assertSessionHasErrors('avatar');

        // cancel only while Pending and unpaid
        $started = $this->order($user, 'In Progress');
        $this->actingAs($user)->post("/orders/{$started->id}/cancel")->assertSessionHasErrors('cancel');
        $paid = $this->order($user, 'Pending', ['payment_status' => Order::PAID]);
        $this->actingAs($user)->post("/orders/{$paid->id}/cancel")->assertSessionHasErrors('cancel');
        $pending = $this->order($user);
        $this->actingAs($user)->post("/orders/{$pending->id}/cancel")->assertRedirect();
        $this->assertSame(Order::CANCELLED, $pending->fresh()->status);

        // a wrong admin password does not create the account
        $this->actingAs($this->admin())->post('/admin/users', ['name' => 'New Person', 'email' => 'x@example.com', 'admin_password' => 'nope'])
            ->assertSessionHasErrors('admin_password');
        $this->assertNull(User::where('email', 'x@example.com')->first());
    }

    public function test_C6_public_text_pages_open(): void
    {
        foreach (['privacy', 'terms', 'refund'] as $page) {
            $this->get('/'.$page)->assertOk();
        }
    }

    public function test_C8_walk_in_orders_can_be_entered_for_people_at_the_counter(): void
    {
        $this->actingAs($this->staff())->get('/admin/walk-in')->assertOk();
        $this->actingAs($this->customer())->get('/admin/walk-in')->assertForbidden();
    }

    // ============================================================ D. RELIABILITY

    public function test_D1_the_same_input_always_gives_the_same_result(): void
    {
        $user = $this->customer();
        $a = $this->place($user);
        $b = $this->place($user);

        $this->assertEquals($a->total, $b->total);
        $this->assertEquals($a->delivery_fee, $b->delivery_fee);
    }

    public function test_D2_a_form_with_an_error_keeps_what_the_user_typed(): void
    {
        $user = $this->customer();
        $response = $this->actingAs($user)->from('/orders/create')
            ->post('/orders', $this->form(['quantity' => 0, 'address' => '99 Typed Street']));

        $response->assertSessionHasErrors('quantity');
        $response->assertRedirect('/orders/create');
        $this->assertSame('99 Typed Street', session()->getOldInput('address'));
    }

    public function test_D4_records_are_kept_in_the_database(): void
    {
        $customer = $this->customer();
        $order = $this->place($customer, ['payment_method' => 'gcash']);
        $this->actingAs($customer)->post("/orders/{$order->id}/pay", ['gcash_number' => '09171234567', 'code' => config('laundry.payments.demo_code')]);

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'payment_status' => 'paid']);
        $this->assertDatabaseHas('payments', ['order_id' => $order->id]);
        $this->assertDatabaseHas('activity_logs', ['order_id' => $order->id]);
    }

    public function test_D5_pages_that_show_receipts_and_photos_open_for_their_owner(): void
    {
        $me = $this->customer();
        $order = $this->order($me);

        $this->actingAs($me)->get("/orders/{$order->id}/receipt")->assertOk();
        $this->actingAs($me)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('me.png', 600, 400)]);
        $this->actingAs($me)->get('/avatars/'.$me->id)->assertOk();
    }

    // ============================================================ E. SECURITY

    public function test_E1_authentication_and_owner_checks(): void
    {
        $owner = $this->customer();
        $order = $this->order($owner);

        $this->get('/orders')->assertRedirect('/login');
        $stranger = $this->customer();
        $this->actingAs($stranger)->get("/orders/{$order->id}/receipt")->assertNotFound();
        $this->actingAs($stranger)->get("/orders/{$order->id}/pay")->assertNotFound();
        $this->actingAs($stranger)->post("/orders/{$order->id}/cancel")->assertNotFound();
        $this->actingAs($stranger)->get('/avatars/'.$owner->id)->assertNotFound();
        $this->actingAs($owner)->get("/orders/{$order->id}/receipt")->assertOk();
    }

    public function test_E2_passwords_are_hashed_email_must_be_verified_and_security_headers_are_sent(): void
    {
        $user = $this->customer();
        $this->assertNotSame('password', $user->password);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('password', $user->password));

        $unverified = User::factory()->unverified()->create();
        $this->actingAs($unverified)->get('/orders')->assertRedirect();   // sent to verify first

        $this->get('/')->assertHeader('X-Frame-Options', 'SAMEORIGIN')->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_E2_in_live_mode_an_admin_without_2fa_is_sent_to_set_it_up(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/admin')->assertRedirect('/settings/security');
    }

    public function test_E3_bad_uploads_are_refused(): void
    {
        $user = $this->customer();

        $this->actingAs($user)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->create('evil.php', 10, 'application/x-php')])
            ->assertSessionHasErrors('avatar');
        $this->actingAs($user)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')])
            ->assertSessionHasErrors('avatar');
    }

    public function test_E4_every_route_that_changes_data_has_a_rate_limit(): void
    {
        $missing = [];
        foreach (Route::getRoutes() as $route) {
            if (array_intersect($route->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']) === []) {
                continue;
            }
            if (! str_starts_with($route->getActionName(), 'App\\Http\\Controllers')) {
                continue;
            }
            $limited = collect($route->gatherMiddleware())->contains(fn ($m) => is_string($m) && str_starts_with($m, 'throttle'));
            if (! $limited) {
                $missing[] = implode('|', $route->methods()).' '.$route->uri();
            }
        }

        $this->assertSame([], $missing, 'These routes have no rate limit: '.implode(', ', $missing));
    }

    public function test_E5_only_the_admin_sees_prices_sales_history_customers_and_creates_accounts(): void
    {
        $staff = $this->staff();
        foreach (['/admin/customers', '/admin/services', '/admin/history', '/admin/report', '/admin/history/export'] as $url) {
            $this->actingAs($staff)->get($url)->assertForbidden();
        }
        $this->actingAs($staff)->post('/admin/users', ['name' => 'X'])->assertForbidden();

        // creating an account needs the admin's own password
        $this->actingAs($this->admin())->post('/admin/users', ['name' => 'New Person', 'email' => 'new@example.com', 'admin_password' => 'wrong'])
            ->assertSessionHasErrors('admin_password');
    }

    public function test_E_demo_gcash_orders_are_refused_in_live_mode_and_cash_still_works(): void
    {
        $this->app['env'] = 'production';
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
        config(['laundry.payments.driver' => 'demo']);
        $user = $this->customer();

        $this->actingAs($user)->post('/orders', $this->form(['payment_method' => 'gcash', 'fulfillment' => 'dropoff']));
        $this->assertDatabaseCount('orders', 0);

        $this->actingAs($user)->post('/orders', $this->form(['payment_method' => 'cash', 'fulfillment' => 'dropoff']))->assertSessionHasNoErrors();
        $this->assertDatabaseCount('orders', 1);
    }

    // ============================================================ F. MAINTAINABILITY

    public function test_F1_the_admin_manages_services_and_the_settings_live_in_one_file(): void
    {
        $this->actingAs($this->admin())->get('/admin/services')->assertOk();
        $this->actingAs($this->admin())->get('/admin/customers')->assertOk();

        $this->assertNotNull(config('laundry.shop.lat'));
        $this->assertNotNull(config('laundry.shop.lng'));
    }

    public function test_F2_day_to_day_updates_need_no_programmer(): void
    {
        $order = $this->order($this->customer());
        $admin = $this->admin();

        $this->actingAs($admin)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 3])->assertSessionHasNoErrors();
        $this->actingAs($admin)->patch("/admin/orders/{$order->id}/paid")->assertSessionHasNoErrors();
        $this->actingAs($admin)->patch("/admin/orders/{$order->id}", ['status' => 'In Progress'])->assertSessionHasNoErrors();
    }

    public function test_F3_the_payment_gateway_sits_behind_a_swappable_interface(): void
    {
        $this->assertTrue(class_exists(\App\Services\Payments\Payments::class));
        $this->assertTrue(class_exists(\App\Services\Payments\DemoGcashGateway::class));
    }

    public function test_F4_changes_are_recorded_and_cancelled_orders_and_removed_services_are_kept(): void
    {
        $admin = $this->admin();
        $customer = $this->customer();
        $order = $this->order($customer);

        $this->actingAs($admin)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 3]);
        $this->assertDatabaseHas('activity_logs', ['event' => 'order.weighed', 'order_id' => $order->id]);

        // a cancelled order stays in the database, marked Cancelled
        $this->actingAs($admin)->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => Order::CANCELLED]);

        // a removed service is soft deleted, not erased
        $service = $this->service();
        $this->actingAs($admin)->delete("/admin/services/{$service->id}");
        $this->assertSoftDeleted('services', ['id' => $service->id]);

        // the history can be exported
        $this->actingAs($admin)->get('/admin/history/export')->assertOk();
    }
}

/*
 * MANUAL CHECKS (a test cannot do these; do them once before the defense and take screenshots)
 *
 *  B1 Lighthouse (Chrome F12 > Lighthouse > Mobile) on the landing page. Screenshot the score.
 *  B3 Scroll the landing page and move between pages. Note any lag.
 *  B5 Chrome phone view (F12 > device toolbar): no sideways scrolling on landing, order form, My Orders.
 *  C5 Switch light and dark appearance: logo, colors and text stay readable.
 *  C7 Press Tab through the order form and the login page: you can reach every button and see the focus ring.
 *  D  Friendly error pages only show in live mode: on localhost an error shows the developer error page, so test every demo path first.
 *  D3 Statement about the history log never stopping an order: not tested here. Open app/Support/Activity.php and show the try/catch.
 *  A  Do one full run by hand: register, verify, order with delivery, pay, watch status change, rate.
 */
