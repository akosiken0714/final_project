<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CancelOrderTest extends TestCase
{
    use RefreshDatabase;

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
        ], $over));
    }

    public function test_customer_can_cancel_their_pending_order(): void
    {
        $user = User::factory()->create();
        $order = $this->order($user);

        $this->actingAs($user)->post("/orders/{$order->id}/cancel")->assertRedirect();

        $this->assertSame(Order::CANCELLED, $order->fresh()->status);
    }

    public function test_cannot_cancel_once_work_has_started(): void
    {
        $user = User::factory()->create();
        $order = $this->order($user, 'In Progress');

        $this->actingAs($user)->post("/orders/{$order->id}/cancel")->assertSessionHasErrors('cancel');

        $this->assertSame('In Progress', $order->fresh()->status);
    }

    public function test_cannot_cancel_a_paid_order_online(): void
    {
        $user = User::factory()->create();
        $order = $this->order($user, 'Pending', ['payment_status' => Order::PAID]);

        $this->actingAs($user)->post("/orders/{$order->id}/cancel")->assertSessionHasErrors('cancel');

        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_cannot_cancel_someone_elses_order(): void
    {
        $order = $this->order(User::factory()->create());

        $this->actingAs(User::factory()->create())->post("/orders/{$order->id}/cancel")->assertNotFound();

        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_admin_cannot_reopen_a_cancelled_order(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
        $order = $this->order(User::factory()->create(), Order::CANCELLED);

        $this->actingAs($admin)->patch("/admin/orders/{$order->id}", ['status' => 'In Progress'])->assertSessionHasErrors('status');

        $this->assertSame(Order::CANCELLED, $order->fresh()->status);
    }
}
