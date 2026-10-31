<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReceiptTest extends TestCase
{
    use RefreshDatabase;

    private function orderFor(User $customer, array $attrs = []): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        $order = Order::create([
            'user_id' => $customer->id,
            'service_id' => $service->id,
            'quantity' => 2,
            'total' => 90,
            'fulfillment' => Order::DROPOFF,
        ]);
        $order->forceFill($attrs)->save();

        return $order->refresh();
    }

    public function test_owner_can_open_their_receipt(): void
    {
        $me = User::factory()->create();
        $order = $this->orderFor($me);

        $this->actingAs($me)->get("/orders/{$order->id}/receipt")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Orders/Receipt')
                ->where('order.id', $order->id)
                ->where('order.amount_due', 90)
                ->where('backUrl', '/orders'));
    }

    public function test_another_customer_cannot_open_it(): void
    {
        $order = $this->orderFor(User::factory()->create());

        $this->actingAs(User::factory()->create())->get("/orders/{$order->id}/receipt")->assertNotFound();
    }

    public function test_admin_can_open_any_receipt(): void
    {
        $order = $this->orderFor(User::factory()->create());
        $admin = User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->get("/orders/{$order->id}/receipt")
            ->assertInertia(fn (Assert $page) => $page->component('Orders/Receipt')->where('backUrl', '/admin'));
    }

    public function test_cancelled_orders_have_no_receipt(): void
    {
        $me = User::factory()->create();
        $order = $this->orderFor($me, ['status' => Order::CANCELLED]);

        $this->actingAs($me)->get("/orders/{$order->id}/receipt")->assertNotFound();
    }

    public function test_guests_are_sent_to_login(): void
    {
        $order = $this->orderFor(User::factory()->create());

        $this->get("/orders/{$order->id}/receipt")->assertRedirect('/login');
    }
}
