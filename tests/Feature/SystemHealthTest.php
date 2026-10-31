<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Inertia\Inertia;
use Tests\TestCase;

/**
 * A wide "is anything broken?" check for all three sides of PhineWash:
 *   customer, staff (cashier) and admin.
 *
 *   1. Every page opens for the people who should see it, and is closed to everyone else.
 *   2. Nobody can read or touch another customer's order, photo, receipt or notification.
 *   3. The order form refuses bad input, and cannot be cheated (price, status, owner).
 *   4. The shop's status, payment and weigh buttons follow their rules.
 *   5. Weird links (garbage filters, huge page numbers) never crash a page (no 500 error).
 *   6. Pages still open when an order's service was deleted, or when there is lots of data.
 *
 * Put this file in tests/Feature and run:   php artisan test --filter=SystemHealthTest
 * If a test fails, its message names the exact page or case, so you know where to look.
 */
class SystemHealthTest extends TestCase
{
    use RefreshDatabase;

    // ------------------------------------------------------------------ helpers

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

    private function service(int $price = 45): Service
    {
        return Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => $price, 'active' => true]);
    }

    // A ready-made order, saved straight to the database (2 kg at 45 = 90).
    private function order(User $owner, string $status = 'Pending', array $over = []): Order
    {
        return Order::create(array_merge([
            'user_id' => $owner->id,
            'service_id' => $this->service()->id,
            'quantity' => 2,
            'total' => 90,
            'status' => $status,
            'fulfillment' => Order::DROPOFF,
            'payment_method' => Order::CASH,
            'payment_status' => Order::UNPAID,
        ], $over));
    }

    // What the "New order" form sends. The pin sits at the shop, so it is always inside the delivery area.
    private function payload(array $over = []): array
    {
        return array_merge([
            'service_id' => $this->service()->id,
            'quantity' => 3,
            'address' => '12 Sample Street, Barangay One, City',
            'lat' => config('laundry.shop.lat'),
            'lng' => config('laundry.shop.lng'),
        ], $over);
    }

    // "Refused" means 403 (not allowed) or 404 (we pretend it doesn't exist). Both are fine.
    private function assertRefused(TestResponse $response, string $label): void
    {
        $this->assertContains($response->getStatusCode(), [403, 404], "{$label} should be refused, but got {$response->getStatusCode()}");
    }

    // Asks for a page the way the browser does after the first load: the answer is plain JSON of the page's data.
    // That is more reliable for "does this text appear?" checks than the full HTML page, which depends on the
    // Vite dev server and on server-side rendering being on or off on your computer.
    private function inertia(string $url): TestResponse
    {
        return $this->get($url, ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) Inertia::getVersion()]);
    }

    // The page may redirect or show an error message, but it must never crash the server.
    private function assertNoCrash(TestResponse $response, string $label): void
    {
        $this->assertLessThan(500, $response->getStatusCode(), "{$label} crashed with {$response->getStatusCode()}");
    }

    // ------------------------------------------------------------------ 1. who can open which page

    public function test_guests_are_sent_to_login_for_every_private_page(): void
    {
        foreach (['/dashboard', '/orders', '/orders/create', '/settings/profile', '/admin', '/admin/walk-in', '/admin/customers', '/admin/services', '/admin/history', '/admin/report'] as $url) {
            $this->get($url)->assertRedirect('/login');
        }
    }

    public function test_public_pages_open_for_everyone(): void
    {
        foreach (['/', '/privacy', '/terms', '/refund', '/login', '/register'] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_customer_pages_open_for_a_customer(): void
    {
        $customer = $this->customer();

        foreach (['/orders', '/orders/create', '/settings/profile', '/settings/appearance'] as $url) {
            $this->actingAs($customer)->get($url)->assertOk();
        }

        // A customer's "dashboard" is simply their orders page.
        $this->actingAs($customer)->get('/dashboard')->assertRedirect('/orders');
    }

    public function test_a_customer_is_kept_out_of_every_shop_page(): void
    {
        $customer = $this->customer();

        foreach (['/admin', '/admin/walk-in', '/admin/customers', '/admin/services', '/admin/history', '/admin/history/export', '/admin/analytics', '/admin/analytics/export', '/admin/report'] as $url) {
            $this->actingAs($customer)->get($url)->assertForbidden();
        }
    }

    public function test_staff_open_the_order_desk_but_not_the_admin_only_pages(): void
    {
        $staff = $this->staff();

        foreach (['/admin', '/admin/walk-in'] as $url) {
            $this->actingAs($staff)->get($url)->assertOk();
        }

        foreach (['/admin/customers', '/admin/services', '/admin/history', '/admin/history/export', '/admin/analytics/export', '/admin/report'] as $url) {
            $this->actingAs($staff)->get($url)->assertForbidden();
        }
    }

    public function test_admin_can_open_every_admin_page(): void
    {
        $admin = $this->admin();

        foreach (['/admin', '/admin/walk-in', '/admin/customers', '/admin/services', '/admin/history', '/admin/report'] as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }

        // An admin's "dashboard" is the admin desk.
        $this->actingAs($admin)->get('/dashboard')->assertRedirect('/admin');

        $this->actingAs($admin)->get('/admin/analytics')->assertRedirect();

        foreach (['/admin/history/export', '/admin/analytics/export'] as $url) {
            $this->assertNoCrash($this->actingAs($admin)->get($url), $url);
        }
    }

    public function test_customers_and_staff_cannot_use_admin_only_actions(): void
    {
        $order = $this->order($this->customer());
        $service = $this->service();

        foreach ([$this->customer(), $this->staff()] as $person) {
            $this->actingAs($person)->post('/admin/services', ['name' => 'Free wash', 'unit' => 'kg', 'price' => 0])->assertForbidden();
            $this->actingAs($person)->patch("/admin/services/{$service->id}", ['price' => 1])->assertForbidden();
            $this->actingAs($person)->delete("/admin/services/{$service->id}")->assertForbidden();
            $this->actingAs($person)->post('/admin/users', ['name' => 'Sneaky', 'email' => 'sneaky@example.com', 'role' => 'admin'])->assertForbidden();
        }

        // The service price must be unchanged.
        $this->assertEquals(45, (float) $service->fresh()->price);
        $this->assertNotNull($order->fresh());
    }

    public function test_customers_cannot_press_the_shop_order_buttons(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);

        $this->actingAs($customer)->patch("/admin/orders/{$order->id}", ['status' => 'Completed'])->assertForbidden();
        $this->actingAs($customer)->patch("/admin/orders/{$order->id}/paid")->assertForbidden();
        $this->actingAs($customer)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 1])->assertForbidden();
        $this->actingAs($customer)->post("/admin/orders/{$order->id}/cancel", ['reason' => 'nope'])->assertForbidden();
        $this->actingAs($customer)->post("/admin/orders/{$order->id}/intake", [])->assertForbidden();
        $this->actingAs($customer)->post('/admin/walk-in', [])->assertForbidden();

        $fresh = $order->fresh();
        $this->assertSame('Pending', $fresh->status);
        $this->assertSame(Order::UNPAID, $fresh->payment_status);
        $this->assertEquals(2, (float) $fresh->quantity);
    }

    // ------------------------------------------------------------------ 2. privacy between customers

    public function test_one_customer_cannot_open_anothers_order_pages_or_files(): void
    {
        $owner = $this->customer();
        $order = $this->order($owner, 'Pending', ['payment_method' => Order::GCASH]);
        $stranger = $this->customer();

        $this->assertRefused($this->actingAs($stranger)->get("/orders/{$order->id}/receipt"), 'receipt');
        $this->assertRefused($this->actingAs($stranger)->get("/orders/{$order->id}/photo"), 'photo');
        $this->assertRefused($this->actingAs($stranger)->get("/orders/{$order->id}/intake-photo"), 'intake photo');
        $this->assertRefused($this->actingAs($stranger)->get("/orders/{$order->id}/pay"), 'pay page');
        $this->assertRefused($this->actingAs($stranger)->post("/orders/{$order->id}/pay", ['gcash_number' => '09123456789', 'code' => '123456']), 'pay action');
        $this->assertRefused($this->actingAs($stranger)->post("/orders/{$order->id}/cancel"), 'cancel');
        $this->assertRefused($this->actingAs($stranger)->post("/orders/{$order->id}/rating", ['stars' => 5]), 'rating');
        $this->assertRefused($this->actingAs($stranger)->delete("/orders/{$order->id}/photo"), 'photo delete');

        $this->assertSame('Pending', $order->fresh()->status);
        $this->assertSame(Order::UNPAID, $order->fresh()->payment_status);
    }

    public function test_the_shop_team_can_open_a_customers_receipt(): void
    {
        $order = $this->order($this->customer());

        $this->actingAs($this->staff())->get("/orders/{$order->id}/receipt")->assertOk();
        $this->actingAs($this->admin())->get("/orders/{$order->id}/receipt")->assertOk();
        $this->actingAs($order->user)->get("/orders/{$order->id}/receipt")->assertOk();
    }

    public function test_a_cancelled_order_has_no_receipt(): void
    {
        $owner = $this->customer();
        $order = $this->order($owner, Order::CANCELLED);

        $this->actingAs($owner)->get("/orders/{$order->id}/receipt")->assertNotFound();
    }

    public function test_other_customers_orders_never_appear_in_my_pages(): void
    {
        $a = $this->customer();
        $b = $this->customer();

        $this->actingAs($b)->post('/orders', $this->payload(['address' => 'ZZQQ-PRIVATE-ADDRESS-77 Street']))->assertRedirect('/orders');

        $this->actingAs($a);
        foreach (['/orders', '/orders/create'] as $url) {
            $this->assertStringNotContainsString('ZZQQ-PRIVATE-ADDRESS-77', $this->inertia($url)->getContent(), "{$url} leaked another customer's order");
        }

        // The shop team, of course, can see it.
        $this->actingAs($this->admin());
        $this->assertStringContainsString('ZZQQ-PRIVATE-ADDRESS-77', $this->inertia('/admin')->getContent(), 'the shop team cannot see the new order');
    }

    public function test_notifications_belong_to_one_person_only(): void
    {
        $owner = $this->customer();
        $other = $this->customer();
        $order = $this->order($owner);

        Activity::notifyUser($owner, 'Hello', 'Body text', '/orders', $order->id);
        $id = DB::table('notifications')->where('notifiable_id', $owner->id)->value('id');
        $this->assertNotNull($id, 'the notification was not created');

        $this->actingAs($other)->post("/notifications/{$id}/read");
        $this->assertNull(DB::table('notifications')->where('id', $id)->value('read_at'), "someone else marked another person's notification as read");

        $this->actingAs($owner)->post("/notifications/{$id}/read");
        $this->assertNotNull(DB::table('notifications')->where('id', $id)->value('read_at'));
    }

    public function test_a_customer_cannot_make_themselves_admin_through_settings(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer)->patch('/settings/profile', [
            'name' => 'New Name',
            'email' => $customer->email,
            'role' => 'admin',
        ]);

        $this->assertSame('customer', $customer->fresh()->role);
    }

    // ------------------------------------------------------------------ 3. the order form

    public function test_a_normal_order_is_saved_with_the_servers_price(): void
    {
        $customer = $this->customer();

        $this->actingAs($customer)->post('/orders', $this->payload())->assertRedirect('/orders');

        $order = Order::firstOrFail();
        $this->assertSame($customer->id, $order->user_id);
        $this->assertEquals(135, (float) $order->total); // 3 kg x 45
        $this->assertSame('Pending', $order->status);
    }

    public function test_cheating_fields_in_the_order_form_are_ignored(): void
    {
        $customer = $this->customer();
        $victim = $this->customer();

        $this->actingAs($customer)->post('/orders', $this->payload([
            'total' => 1,
            'price' => 1,
            'delivery_fee' => 0,
            'status' => 'Completed',
            'payment_status' => 'paid',
            'user_id' => $victim->id,
            'cancel_reason' => 'hack',
        ]));

        $order = Order::firstOrFail();
        $this->assertEquals(135, (float) $order->total, 'the customer was able to set the price');
        $this->assertSame('Pending', $order->status, 'the customer was able to set the status');
        $this->assertSame(Order::UNPAID, $order->payment_status, 'the customer was able to mark it paid');
        $this->assertSame($customer->id, $order->user_id, 'the customer was able to order as someone else');
    }

    public function test_bad_quantities_are_refused(): void
    {
        foreach ([0, -1, 101, 'abc', '1.5', ''] as $bad) {
            $this->actingAs($this->customer())->post('/orders', $this->payload(['quantity' => $bad]))
                ->assertSessionHasErrors('quantity');
        }

        $this->assertSame(0, Order::count());
    }

    public function test_bad_choices_are_refused(): void
    {
        $cases = [
            'payment_method' => ['bitcoin', 'payment_method'],
            'fulfillment' => ['teleport', 'fulfillment'],
            'pickup_slot' => ['midnight', 'pickup_slot'],
            'pickup_date' => [now()->subDay()->toDateString(), 'pickup_date'],
        ];

        foreach ($cases as $field => [$value, $errorKey]) {
            $this->actingAs($this->customer())->post('/orders', $this->payload([$field => $value]))
                ->assertSessionHasErrors($errorKey);
        }

        // More than 7 days ahead
        $this->actingAs($this->customer())->post('/orders', $this->payload(['pickup_date' => now()->addDays(9)->toDateString()]))
            ->assertSessionHasErrors('pickup_date');

        // Over-long instructions
        $this->actingAs($this->customer())->post('/orders', $this->payload(['instructions' => str_repeat('a', 501)]))
            ->assertSessionHasErrors('instructions');

        $this->assertSame(0, Order::count());
    }

    public function test_missing_service_and_hidden_service_are_refused(): void
    {
        $hidden = Service::create(['name' => 'Hidden', 'unit' => 'kg', 'price' => 45, 'active' => false]);
        $deleted = $this->service();
        $deleted->delete();

        foreach ([null, 999999, $hidden->id] as $bad) {
            $this->actingAs($this->customer())->post('/orders', $this->payload(['service_id' => $bad]))
                ->assertSessionHasErrors('service_id');
        }

        // A service the admin removed: either a friendly error message or a 404 is fine. Taking the order is not.
        $response = $this->actingAs($this->customer())->post('/orders', $this->payload(['service_id' => $deleted->id]));
        $this->assertTrue(
            $response->getStatusCode() === 404 || session()->has('errors'),
            'an order was accepted for a service that was removed'
        );

        $this->assertSame(0, Order::count());
    }

    public function test_delivery_needs_a_pin_inside_the_delivery_area(): void
    {
        // No pin
        $this->actingAs($this->customer())->post('/orders', $this->payload(['lat' => '', 'lng' => '']))
            ->assertSessionHasErrors(['lat', 'lng']);

        // A pin that is not even on Earth
        $this->actingAs($this->customer())->post('/orders', $this->payload(['lat' => 95, 'lng' => 400]))
            ->assertSessionHasErrors();

        // About 110 km away: far outside the delivery area
        $this->actingAs($this->customer())->post('/orders', $this->payload(['lat' => (float) config('laundry.shop.lat') + 1.0]))
            ->assertSessionHasErrors('lat');

        // Too short an address
        $this->actingAs($this->customer())->post('/orders', $this->payload(['address' => 'Home']))
            ->assertSessionHasErrors('address');

        $this->assertSame(0, Order::count());
    }

    public function test_drop_off_needs_no_address_or_pin(): void
    {
        $this->actingAs($this->customer())
            ->post('/orders', ['service_id' => $this->service()->id, 'quantity' => 2, 'fulfillment' => Order::DROPOFF])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, Order::count());
    }

    public function test_the_gcash_form_refuses_wrong_details(): void
    {
        $owner = $this->customer();
        $order = $this->order($owner, 'Pending', ['payment_method' => Order::GCASH]);

        $bad = [
            ['gcash_number' => '12345', 'code' => '123456'],
            ['gcash_number' => '0912345678', 'code' => '123456'],
            ['gcash_number' => '09123456789', 'code' => '12'],
            ['gcash_number' => '09123456789', 'code' => 'abcdef'],
            ['gcash_number' => '', 'code' => ''],
        ];

        foreach ($bad as $details) {
            $this->actingAs($owner)->post("/orders/{$order->id}/pay", $details)->assertSessionHasErrors();
        }

        $this->assertSame(Order::UNPAID, $order->fresh()->payment_status);
    }

    // ------------------------------------------------------------------ 4. the shop's buttons

    public function test_an_order_walks_through_every_status_to_completed(): void
    {
        $order = $this->order($this->customer());
        $admin = $this->admin();

        foreach (['In Progress', 'Ready for Pickup', 'Out for Delivery', 'Completed'] as $status) {
            $this->actingAs($admin)->patch("/admin/orders/{$order->id}", ['status' => $status])->assertSessionHasNoErrors();
            $this->assertSame($status, $order->fresh()->status);
        }

        // Cash is counted as paid when the order is claimed.
        $this->assertSame(Order::PAID, $order->fresh()->payment_status);
        $this->assertGreaterThanOrEqual(4, DB::table('order_status_logs')->where('order_id', $order->id)->count());
    }

    public function test_staff_can_also_change_status(): void
    {
        $order = $this->order($this->customer());

        $this->actingAs($this->staff())->patch("/admin/orders/{$order->id}", ['status' => 'In Progress'])->assertSessionHasNoErrors();

        $this->assertSame('In Progress', $order->fresh()->status);
    }

    public function test_made_up_statuses_and_the_cancel_shortcut_are_refused(): void
    {
        $order = $this->order($this->customer());

        foreach (['Banana', '', 'Cancelled', 'completed'] as $bad) {
            $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}", ['status' => $bad])->assertSessionHasErrors('status');
        }

        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_finished_orders_cannot_be_reopened(): void
    {
        $done = $this->order($this->customer(), Order::CLAIMED);

        foreach (['Pending', 'In Progress', 'Ready for Pickup'] as $back) {
            $this->actingAs($this->admin())->patch("/admin/orders/{$done->id}", ['status' => $back])->assertSessionHasErrors('status');
        }

        $this->assertSame(Order::CLAIMED, $done->fresh()->status);
    }

    public function test_cash_can_be_marked_paid_but_gcash_cannot_be_marked_by_hand(): void
    {
        $cash = $this->order($this->customer(), 'Pending', ['payment_method' => Order::CASH]);
        $gcash = $this->order($this->customer(), 'Pending', ['payment_method' => Order::GCASH]);

        $this->actingAs($this->staff())->patch("/admin/orders/{$cash->id}/paid")->assertSessionHasNoErrors();
        $this->assertSame(Order::PAID, $cash->fresh()->payment_status);

        $this->actingAs($this->admin())->patch("/admin/orders/{$gcash->id}/paid")->assertSessionHasErrors('payment');
        $this->assertSame(Order::UNPAID, $gcash->fresh()->payment_status);
    }

    public function test_weighing_refuses_bad_numbers_and_accepts_good_ones(): void
    {
        $admin = $this->admin();

        foreach ([0, -3, 'abc', '', 201, '4.567'] as $bad) {
            $order = $this->order($this->customer());

            $this->actingAs($admin)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => $bad])
                ->assertSessionHasErrors('quantity');

            $this->assertEquals(2, (float) $order->fresh()->quantity, "weigh accepted '{$bad}'");
        }

        $good = $this->order($this->customer());
        $this->actingAs($admin)->patch("/admin/orders/{$good->id}/weigh", ['quantity' => 4.6])->assertSessionHasNoErrors();
        $this->assertEquals(4.6, (float) $good->fresh()->quantity);
        $this->assertEquals(207, (float) $good->fresh()->total); // 4.6 kg x 45
    }

    public function test_a_customer_can_rate_only_a_completed_order_with_1_to_5_stars(): void
    {
        $customer = $this->customer();
        $pending = $this->order($customer);
        $done = $this->order($customer, Order::CLAIMED);

        $this->actingAs($customer)->post("/orders/{$pending->id}/rating", ['stars' => 5])->assertSessionHasErrors('rating');

        foreach ([0, 6, 'x', ''] as $bad) {
            $this->actingAs($customer)->post("/orders/{$done->id}/rating", ['stars' => $bad])->assertSessionHasErrors('stars');
        }

        $this->actingAs($customer)->post("/orders/{$done->id}/rating", ['stars' => 4, 'comment' => 'Nice'])->assertSessionHasNoErrors();
    }

    // ------------------------------------------------------------------ 5. weird links never crash a page

    public function test_garbage_in_the_address_bar_never_crashes_an_admin_page(): void
    {
        $this->order($this->customer());
        $admin = $this->admin();

        $urls = [
            '/admin?view=zzz', '/admin?q=%25', '/admin?q=%27%22', '/admin?q=<script>alert(1)</script>',
            '/admin?page=999999', '/admin?page=-1', '/admin?page=abc', '/admin?status[]=x', '/admin?status=zzz',
            '/admin?payment=zzz', '/admin?from=not-a-date', '/admin?to=2026-13-45', '/admin?from=2030-01-01&to=2000-01-01',
            '/admin/history?type=zzz&q=%27', '/admin/history?page=99999', '/admin/history?from=abc',
            '/admin/customers?q=%00', '/admin/customers?page=99999',
            '/admin/report?period=abc', '/admin/report?period=-5', '/admin/report?period=99999', '/admin/report?period[]=1',
            // a filter sent as a list instead of a single value
            '/admin?q[]=x', '/admin?pay[]=x', '/admin?from[]=x', '/admin/history?q[]=x', '/admin/history?type[]=x', '/admin/customers?q[]=x', '/admin/walk-in?q[]=x',
        ];

        foreach ($urls as $url) {
            $this->assertNoCrash($this->actingAs($admin)->get($url), $url);
        }
    }

    public function test_garbage_in_the_address_bar_never_crashes_a_customer_page(): void
    {
        $customer = $this->customer();
        $this->order($customer);

        foreach (['/orders?view=zzz', '/orders?page=999999', '/orders?page=-1', '/orders?q=<script>', '/orders/create?saved=abc', '/orders/create?saved=999999', '/orders/99999999/receipt', '/orders/abc/receipt'] as $url) {
            $this->assertNoCrash($this->actingAs($customer)->get($url), $url);
        }
    }

    public function test_an_order_that_does_not_exist_is_a_clean_404(): void
    {
        $customer = $this->customer();

        foreach (['/orders/99999999/pay', '/orders/99999999/photo', '/orders/99999999/receipt'] as $url) {
            $this->actingAs($customer)->get($url)->assertNotFound();
        }

        $this->actingAs($this->admin())->patch('/admin/orders/99999999', ['status' => 'Completed'])->assertNotFound();
    }

    // ------------------------------------------------------------------ 6. pages with real-life data

    public function test_pages_still_open_when_an_orders_service_was_deleted(): void
    {
        $customer = $this->customer();
        $order = $this->order($customer);
        $order->service->delete();

        $this->assertNoCrash($this->actingAs($customer)->get('/orders'), '/orders');
        $this->assertNoCrash($this->actingAs($customer)->get('/dashboard'), '/dashboard');
        $this->assertNoCrash($this->actingAs($customer)->get("/orders/{$order->id}/receipt"), 'receipt');

        $admin = $this->admin();
        foreach (['/admin', '/admin/history', '/admin/report', '/admin/customers', '/dashboard'] as $url) {
            $this->assertNoCrash($this->actingAs($admin)->get($url), $url);
        }
    }

    public function test_pages_open_with_orders_in_every_status_and_payment_state(): void
    {
        $customer = $this->customer();
        $admin = $this->admin();

        foreach (array_merge(Order::STATUSES, [Order::CANCELLED]) as $status) {
            foreach ([Order::UNPAID, Order::PAID] as $paid) {
                $this->order($customer, $status, ['payment_status' => $paid, 'cancel_reason' => $status === Order::CANCELLED ? 'Test reason' : null]);
                $this->order($customer, $status, ['payment_status' => $paid, 'payment_method' => Order::GCASH, 'fulfillment' => Order::DELIVERY, 'address' => '12 Sample Street, Barangay One', 'lat' => config('laundry.shop.lat'), 'lng' => config('laundry.shop.lng')]);
            }
        }

        // One order that was weighed at the counter
        $this->actingAs($admin)->patch('/admin/orders/'.Order::first()->id.'/weigh', ['quantity' => 3.4]);

        foreach (['/admin', '/admin/history', '/admin/report', '/admin/customers', '/dashboard'] as $url) {
            $this->assertNoCrash($this->actingAs($admin)->get($url), $url);
        }

        foreach (['/orders', '/dashboard'] as $url) {
            $this->assertNoCrash($this->actingAs($customer)->get($url), $url);
        }

        foreach (Order::all() as $order) {
            $response = $this->actingAs($customer)->get("/orders/{$order->id}/receipt");
            $this->assertNoCrash($response, "receipt of order {$order->id} ({$order->status})");
        }
    }

    // ------------------------------------------------------------------ 7. basic safety headers

    public function test_security_headers_are_sent(): void
    {
        $response = $this->get('/');

        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
