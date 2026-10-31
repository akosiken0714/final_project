<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminOrderSearchTest extends TestCase
{
    use RefreshDatabase;

    private function orderFor(User $customer): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return Order::create([
            'user_id' => $customer->id,
            'service_id' => $service->id,
            'quantity' => 1,
            'total' => 45,
            'fulfillment' => Order::DROPOFF,
        ]);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    public function test_without_a_search_all_ongoing_orders_show(): void
    {
        $this->orderFor(User::factory()->create(['name' => 'Maria Santos']));
        $this->orderFor(User::factory()->create(['name' => 'Juan Dela Cruz']));

        $this->actingAs($this->admin())->get('/admin')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Orders')->has('orders', 2));
    }

    public function test_search_by_customer_name(): void
    {
        $this->orderFor(User::factory()->create(['name' => 'Maria Santos']));
        $this->orderFor(User::factory()->create(['name' => 'Juan Dela Cruz']));

        $this->actingAs($this->admin())->get('/admin?q=Maria')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('search', 'Maria'));
    }

    public function test_search_by_order_number(): void
    {
        $this->orderFor(User::factory()->create());
        $wanted = $this->orderFor(User::factory()->create());

        $this->actingAs($this->admin())->get('/admin?q=%23'.$wanted->id)
            ->assertInertia(fn (Assert $page) => $page->has('orders', 1)->where('orders.0.id', $wanted->id));
    }

    public function test_search_with_no_match_shows_nothing(): void
    {
        $this->orderFor(User::factory()->create(['name' => 'Maria Santos']));

        $this->actingAs($this->admin())->get('/admin?q=zzzz')
            ->assertInertia(fn (Assert $page) => $page->has('orders', 0));
    }
}
