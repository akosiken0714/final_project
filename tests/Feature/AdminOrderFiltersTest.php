<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminOrderFiltersTest extends TestCase
{
    use RefreshDatabase;

    private function orderWith(array $attrs = []): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        $order = Order::create([
            'user_id' => User::factory()->create()->id,
            'service_id' => $service->id,
            'quantity' => 1,
            'total' => 45,
            'fulfillment' => Order::DROPOFF,
        ]);

        // forceFill so the test does not depend on what is mass-assignable.
        $order->forceFill($attrs)->save();

        return $order->refresh();
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    public function test_filter_by_status(): void
    {
        $this->orderWith();
        $this->orderWith(['status' => 'In Progress']);

        $this->actingAs($this->admin())->get('/admin?status=In%20Progress')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('orders.0.status', 'In Progress')->where('filters.status', 'In Progress'));
    }

    public function test_filter_by_paid_and_unpaid(): void
    {
        $this->orderWith(['payment_status' => Order::PAID]);
        $this->orderWith(['payment_status' => Order::UNPAID]);
        $this->orderWith(['payment_status' => Order::UNPAID]);

        $admin = $this->admin();

        $this->actingAs($admin)->get('/admin?pay=paid')->assertInertia(fn (Assert $page) => $page->has('orders', 1));
        $this->actingAs($admin)->get('/admin?pay=unpaid')->assertInertia(fn (Assert $page) => $page->has('orders', 2));
    }

    public function test_filter_by_date_range(): void
    {
        $old = $this->orderWith();
        $old->forceFill(['created_at' => now()->subDays(20)])->save();
        $this->orderWith();

        $this->actingAs($this->admin())->get('/admin?from='.now()->subDays(2)->toDateString())
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1));
    }

    public function test_invalid_filters_are_ignored(): void
    {
        $this->orderWith();

        $this->actingAs($this->admin())->get('/admin?status=bogus&pay=maybe&from=nope&to=2026-99-99')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('filters.status', '')->where('filters.from', ''));
    }

    public function test_admin_can_see_cancelled_orders_in_their_own_view(): void
    {
        $this->orderWith(['status' => Order::CANCELLED]);
        $this->orderWith();

        $this->actingAs($this->admin())->get('/admin?view=cancelled')
            ->assertInertia(fn (Assert $page) => $page->where('view', 'cancelled')->has('orders', 1)->where('counts.cancelled', 1)->where('counts.finished', 0));
    }

    public function test_customer_cannot_use_the_cancelled_view(): void
    {
        $service = Service::create(['name' => 'Wash', 'unit' => 'kg', 'price' => 45, 'active' => true]);
        $mine = User::factory()->create();
        Order::create(['user_id' => $mine->id, 'service_id' => $service->id, 'quantity' => 1, 'total' => 45, 'fulfillment' => Order::DROPOFF]);

        $this->actingAs($mine)->get('/orders?view=cancelled')
            ->assertInertia(fn (Assert $page) => $page->where('view', 'ongoing'));
    }
}
