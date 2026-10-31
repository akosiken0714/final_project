<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StaffRoleTest extends TestCase
{
    use RefreshDatabase;

    private function staff(): User
    {
        return User::factory()->create(['role' => 'staff']);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    // 2 kg at 45 = 90 total.
    private function order(User $owner, string $status = 'Pending', array $over = []): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return Order::create(array_merge([
            'user_id' => $owner->id,
            'service_id' => $service->id,
            'quantity' => 2,
            'total' => 90,
            'status' => $status,
            'fulfillment' => Order::DROPOFF,
            'payment_method' => Order::CASH,
            'payment_status' => Order::UNPAID,
        ], $over));
    }

    public function test_staff_can_open_the_order_desk_but_gets_no_revenue_or_analytics(): void
    {
        $this->actingAs($this->staff())->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Orders')
                ->where('can.revenue', false)
                ->where('can.analytics', false)
                ->where('can.cancelPaid', false)
                ->where('stats.revenue', null)
                ->where('analytics', null));
    }

    public function test_admin_still_gets_revenue_and_analytics(): void
    {
        $this->actingAs($this->admin())->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Orders')
                ->where('can.revenue', true)
                ->where('can.analytics', true)
                ->where('can.cancelPaid', true)
                ->has('analytics'));
    }

    public function test_staff_are_kept_out_of_the_admin_only_pages(): void
    {
        $staff = $this->staff();

        foreach (['/admin/customers', '/admin/services', '/admin/history', '/admin/report', '/admin/analytics/export', '/admin/history/export'] as $url) {
            $this->actingAs($staff)->get($url)->assertForbidden();
        }

        $this->actingAs($staff)->post('/admin/users', ['name' => 'X'])->assertForbidden();
        $this->actingAs($staff)->delete("/admin/users/{$staff->id}")->assertForbidden();
        $this->actingAs($staff)->post('/admin/services', ['name' => 'X'])->assertForbidden();
    }

    public function test_customers_cannot_reach_the_order_desk_or_walk_in_page(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->get('/admin')->assertForbidden();
        $this->actingAs($customer)->get('/admin/walk-in')->assertForbidden();
        $this->actingAs($customer)->post('/admin/walk-in', [])->assertForbidden();
    }

    public function test_staff_can_run_an_order_through_the_desk(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);
        $staff = $this->staff();

        $this->actingAs($staff)->patch("/admin/orders/{$order->id}", ['status' => 'In Progress'])->assertSessionHasNoErrors();
        $this->assertSame('In Progress', $order->fresh()->status);

        $this->actingAs($staff)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 3.5])->assertSessionHasNoErrors();
        $this->assertEquals(157.5, (float) $order->fresh()->total);

        $this->actingAs($staff)->patch("/admin/orders/{$order->id}/paid")->assertSessionHasNoErrors();
        $this->assertTrue($order->fresh()->isPaid());
    }

    public function test_staff_can_cancel_an_unpaid_order(): void
    {
        $order = $this->order(User::factory()->create());

        $this->actingAs($this->staff())
            ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel'])
            ->assertSessionHasNoErrors();

        $this->assertSame(Order::CANCELLED, $order->fresh()->status);
    }

    public function test_staff_cannot_cancel_a_paid_order_but_an_admin_can(): void
    {
        $order = $this->order(User::factory()->create(), 'Pending', ['payment_status' => Order::PAID]);

        $this->actingAs($this->staff())
            ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel'])
            ->assertSessionHasErrors('reason');
        $this->assertSame('Pending', $order->fresh()->status);

        $this->actingAs($this->admin())
            ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel'])
            ->assertSessionHasNoErrors();
        $this->assertSame(Order::CANCELLED, $order->fresh()->status);
    }

    public function test_staff_can_open_any_receipt_and_lands_on_the_desk_from_the_dashboard(): void
    {
        $order = $this->order(User::factory()->create());
        $staff = $this->staff();

        $this->actingAs($staff)->get("/orders/{$order->id}/receipt")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('backUrl', '/admin'));

        $this->actingAs($staff)->get('/dashboard')->assertRedirect('/admin');
    }

    public function test_new_order_alerts_reach_staff_as_well_as_admins(): void
    {
        $staff = $this->staff();
        $admin = $this->admin();
        $customer = User::factory()->create();

        Activity::notifyAdmins('New order #0001', 'test', '/admin');

        $this->assertDatabaseHas('notifications', ['notifiable_id' => $staff->id]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $admin->id]);
        $this->assertDatabaseMissing('notifications', ['notifiable_id' => $customer->id]);
    }

    public function test_staff_cannot_delete_their_own_account(): void
    {
        $staff = $this->staff();

        $this->actingAs($staff)->from(route('profile.edit'))
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors('password');

        $this->assertNotSoftDeleted('users', ['id' => $staff->id]);
    }
}
