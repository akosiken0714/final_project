<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminAttentionTest extends TestCase
{
    use RefreshDatabase;

    private function order(array $attrs = []): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        $order = Order::create([
            'user_id' => User::factory()->create()->id,
            'service_id' => $service->id,
            'quantity' => 1,
            'total' => 45,
            'fulfillment' => Order::DROPOFF,
        ]);
        $order->forceFill($attrs)->save();

        return $order->refresh();
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    public function test_all_clear_when_nothing_is_late(): void
    {
        $this->order();

        $this->actingAs($this->admin())->get('/admin')
            ->assertInertia(fn (Assert $page) => $page->where('attention.waiting', 0)->where('attention.readyOld', 0));
    }

    public function test_old_pending_and_old_ready_orders_are_counted(): void
    {
        $this->order(['created_at' => now()->subDays(2)]);
        $this->order(['status' => Order::READY, 'updated_at' => now()->subDays(3)]);
        $this->order(); // fresh, not counted

        $this->actingAs($this->admin())->get('/admin')
            ->assertInertia(fn (Assert $page) => $page->where('attention.waiting', 1)->where('attention.readyOld', 1));
    }

    public function test_checkout_gets_the_ready_time(): void
    {
        $this->actingAs(User::factory()->create())->get('/orders/create')
            ->assertInertia(fn (Assert $page) => $page->where('readyHours', 24));
    }
}
