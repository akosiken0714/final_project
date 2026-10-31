<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminWeighAndCancelTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    // 2 kg at 45 = 90 total, so the price per kg is 45.
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

    public function test_weighing_recalculates_the_total_and_keeps_the_estimate(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);

        $this->actingAs($this->admin())
            ->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 3.5])
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertEquals(3.5, (float) $order->quantity);
        $this->assertEquals(157.5, (float) $order->total);
        $this->assertEquals(2, (float) $order->estimated_quantity);
        $this->assertNotNull($order->weighed_at);
        $this->assertDatabaseHas('activity_logs', ['event' => 'order.weighed', 'order_id' => $order->id]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $customer->id]);
    }

    public function test_weighing_twice_keeps_the_first_estimate(): void
    {
        $order = $this->order(User::factory()->create());
        $admin = $this->admin();

        $this->actingAs($admin)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 3]);
        $this->actingAs($admin)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 4]);

        $order->refresh();
        $this->assertEquals(2, (float) $order->estimated_quantity);
        $this->assertEquals(180, (float) $order->total);
    }

    public function test_delivery_fee_is_not_changed_by_weighing(): void
    {
        $order = $this->order(User::factory()->create(), 'Pending', ['delivery_fee' => 40]);

        $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 4]);

        $order->refresh();
        $this->assertEquals(180, (float) $order->total);
        $this->assertEquals(40, (float) $order->delivery_fee);
        $this->assertEquals(220, $order->amount_due);
    }

    public function test_bad_amounts_are_refused(): void
    {
        $order = $this->order(User::factory()->create());
        $admin = $this->admin();

        foreach ([0, -1, 500, 'abc', 1.234] as $bad) {
            $this->actingAs($admin)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => $bad])
                ->assertSessionHasErrors('quantity');
        }

        $this->assertEquals(2, (float) $order->fresh()->quantity);
    }

    public function test_a_paid_order_cannot_be_reweighed(): void
    {
        $order = $this->order(User::factory()->create(), 'Pending', ['payment_status' => Order::PAID]);

        $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 5])
            ->assertSessionHasErrors('quantity');

        $this->assertEquals(90, (float) $order->fresh()->total);
    }

    public function test_a_completed_order_cannot_be_reweighed(): void
    {
        $order = $this->order(User::factory()->create(), Order::CLAIMED);

        $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 5])
            ->assertSessionHasErrors('quantity');
    }

    public function test_customers_cannot_weigh_or_admin_cancel(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);

        $this->actingAs($customer)->patch("/admin/orders/{$order->id}/weigh", ['quantity' => 1])->assertForbidden();
        $this->actingAs($customer)->post("/admin/orders/{$order->id}/cancel", ['reason' => 'nope'])->assertForbidden();

        $this->assertEquals(2, (float) $order->fresh()->quantity);
        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_admin_can_cancel_an_in_progress_order_with_a_reason(): void
    {
        $customer = User::factory()->create();
        $order = $this->order($customer, 'In Progress');

        $this->actingAs($this->admin())
            ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel'])
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(Order::CANCELLED, $order->status);
        $this->assertSame('Customer asked to cancel', $order->cancel_reason);
        $this->assertDatabaseHas('order_status_logs', ['order_id' => $order->id, 'to_status' => Order::CANCELLED]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $customer->id]);
    }

    public function test_cancel_needs_a_reason(): void
    {
        $order = $this->order(User::factory()->create());

        $this->actingAs($this->admin())->post("/admin/orders/{$order->id}/cancel", ['reason' => ''])
            ->assertSessionHasErrors('reason');

        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_completed_and_already_cancelled_orders_cannot_be_cancelled(): void
    {
        $admin = $this->admin();
        $done = $this->order(User::factory()->create(), Order::CLAIMED);
        $gone = $this->order(User::factory()->create(), Order::CANCELLED);

        $this->actingAs($admin)->post("/admin/orders/{$done->id}/cancel", ['reason' => 'mistake'])->assertSessionHasErrors('reason');
        $this->actingAs($admin)->post("/admin/orders/{$gone->id}/cancel", ['reason' => 'mistake'])->assertSessionHasErrors('reason');

        $this->assertSame(Order::CLAIMED, $done->fresh()->status);
    }

    public function test_cancelling_a_paid_order_reminds_the_admin_to_refund(): void
    {
        $order = $this->order(User::factory()->create(), 'Pending', ['payment_status' => Order::PAID]);

        $response = $this->actingAs($this->admin())
            ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Out of stock']);

        $response->assertSessionHasNoErrors();
        $this->assertStringContainsString('refund', (string) session('success'));
        $this->assertSame(Order::CANCELLED, $order->fresh()->status);
    }
}
