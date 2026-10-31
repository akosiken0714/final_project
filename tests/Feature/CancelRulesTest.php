<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The cancel rules, checked for EVERY status and EVERY role.
 *
 *   Customer : only a Pending, unpaid order of their own.
 *   Staff    : any unfinished order, with a reason, but NOT a paid one (a refund needs an admin).
 *   Admin    : any unfinished order, with a reason, paid ones too.
 *   Nobody   : Completed or already Cancelled orders.
 *
 * Put this file in tests/Feature and run:  php artisan test --filter=CancelRulesTest
 */
class CancelRulesTest extends TestCase
{
    use RefreshDatabase;

    // Every status an order can be in.
    private const ALL = ['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled'];

    // Statuses where the shop team may still cancel (the work is not finished).
    private const SHOP_CAN = ['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery'];

    private function order(User $owner, string $status, bool $paid = false): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return Order::create([
            'user_id' => $owner->id,
            'service_id' => $service->id,
            'quantity' => 2,
            'total' => 90,
            'status' => $status,
            'fulfillment' => Order::DROPOFF,
            'payment_method' => Order::CASH,
            'payment_status' => $paid ? Order::PAID : Order::UNPAID,
        ]);
    }

    // A new person each time, so the "10 cancels per minute" limit never gets in the way of the test.
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

    // ---------- CUSTOMER ----------

    public function test_customer_can_cancel_only_a_pending_unpaid_order(): void
    {
        foreach (self::ALL as $status) {
            $owner = $this->customer();
            $order = $this->order($owner, $status);

            $this->actingAs($owner)->post("/orders/{$order->id}/cancel");

            $expected = $status === 'Pending' ? Order::CANCELLED : $status;
            $this->assertSame($expected, $order->fresh()->status, "Customer + {$status} (unpaid)");
        }
    }

    public function test_customer_can_never_cancel_a_paid_order(): void
    {
        foreach (self::ALL as $status) {
            $owner = $this->customer();
            $order = $this->order($owner, $status, paid: true);

            $this->actingAs($owner)->post("/orders/{$order->id}/cancel");

            $this->assertSame($status, $order->fresh()->status, "Customer + {$status} (paid)");
        }
    }

    public function test_customer_cannot_cancel_someone_elses_order(): void
    {
        $order = $this->order($this->customer(), 'Pending');

        $this->actingAs($this->customer())->post("/orders/{$order->id}/cancel")->assertNotFound();

        $this->assertSame('Pending', $order->fresh()->status);
    }

    public function test_customer_cannot_use_the_shop_cancel(): void
    {
        foreach (self::ALL as $status) {
            $owner = $this->customer();
            $order = $this->order($owner, $status);

            $this->actingAs($owner)
                ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'trying my luck'])
                ->assertForbidden();

            $this->assertSame($status, $order->fresh()->status, "Customer on shop route + {$status}");
        }
    }

    // ---------- STAFF (cashier) ----------

    public function test_staff_can_cancel_unfinished_unpaid_orders_but_not_finished_ones(): void
    {
        foreach (self::ALL as $status) {
            $order = $this->order($this->customer(), $status);

            $this->actingAs($this->staff())
                ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel']);

            $expected = in_array($status, self::SHOP_CAN, true) ? Order::CANCELLED : $status;
            $this->assertSame($expected, $order->fresh()->status, "Staff + {$status} (unpaid)");
        }
    }

    public function test_staff_cannot_cancel_a_paid_order_at_any_status(): void
    {
        foreach (self::ALL as $status) {
            $order = $this->order($this->customer(), $status, paid: true);

            $this->actingAs($this->staff())
                ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Customer asked to cancel']);

            $this->assertSame($status, $order->fresh()->status, "Staff + {$status} (paid)");
        }
    }

    // ---------- ADMIN ----------

    public function test_admin_can_cancel_unfinished_orders_paid_or_unpaid_but_not_finished_ones(): void
    {
        foreach ([false, true] as $paid) {
            foreach (self::ALL as $status) {
                $order = $this->order($this->customer(), $status, $paid);

                $this->actingAs($this->admin())
                    ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Out of stock']);

                $expected = in_array($status, self::SHOP_CAN, true) ? Order::CANCELLED : $status;
                $this->assertSame($expected, $order->fresh()->status, 'Admin + '.$status.($paid ? ' (paid)' : ' (unpaid)'));
            }
        }
    }

    // ---------- RULES THAT APPLY TO THE SHOP TEAM ----------

    public function test_a_reason_is_required_and_the_order_stays_untouched_without_it(): void
    {
        foreach (self::SHOP_CAN as $status) {
            foreach (['', '  ', 'no'] as $badReason) {
                $order = $this->order($this->customer(), $status);

                $this->actingAs($this->admin())
                    ->post("/admin/orders/{$order->id}/cancel", ['reason' => $badReason])
                    ->assertSessionHasErrors('reason');

                $this->assertSame($status, $order->fresh()->status, "No valid reason + {$status}");
            }
        }
    }

    public function test_a_cancelled_order_keeps_its_reason_and_leaves_a_history_trail(): void
    {
        $owner = $this->customer();
        $order = $this->order($owner, 'In Progress');

        $this->actingAs($this->staff())
            ->post("/admin/orders/{$order->id}/cancel", ['reason' => 'Machine broke down']);

        $order->refresh();
        $this->assertSame(Order::CANCELLED, $order->status);
        $this->assertSame('Machine broke down', $order->cancel_reason);
        $this->assertDatabaseHas('order_status_logs', ['order_id' => $order->id, 'from_status' => 'In Progress', 'to_status' => Order::CANCELLED]);
        $this->assertDatabaseHas('activity_logs', ['event' => 'order.cancelled', 'order_id' => $order->id]);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $owner->id]);
        // Kept, not erased.
        $this->assertDatabaseHas('orders', ['id' => $order->id]);
    }

    public function test_a_cancelled_order_can_never_be_reopened(): void
    {
        foreach (['In Progress', 'Ready for Pickup', 'Completed'] as $target) {
            $order = $this->order($this->customer(), Order::CANCELLED);

            $this->actingAs($this->admin())
                ->patch("/admin/orders/{$order->id}", ['status' => $target])
                ->assertSessionHasErrors('status');

            $this->assertSame(Order::CANCELLED, $order->fresh()->status, "Reopen to {$target}");
        }
    }
}
