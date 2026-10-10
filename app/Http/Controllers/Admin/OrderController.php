<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Support\Activity;
use App\Support\OrderViews;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{
    // The admin dashboard: quick numbers, the orders to work on, and the analytics below them.
    public function index(Request $request)
    {
        $list = OrderViews::resolve($request, Order::query(), ['user', 'service']);

        return Inertia::render('Admin/Orders', $list + [
            'statuses' => Order::STATUSES,
            'stats' => [
                'total' => Order::count(),
                'pending' => Order::where('status', 'Pending')->count(),
                'ready' => Order::where('status', 'Ready for Pickup')->count(),
                'revenue' => (float) Order::where('status', Order::CLAIMED)->sum('total'),
                // GCash orders that were placed but not paid yet
                'awaitingGcash' => Order::where('payment_method', Order::GCASH)->where('payment_status', Order::UNPAID)->count(),
            ],
            'analytics' => app(AnalyticsController::class)->data($request),
        ]);
    }

    public function update(UpdateOrderStatusRequest $request, Order $order)
    {
        $to = $request->validated()['status'];
        $from = $order->status;

        if ($from === $to) {
            return back();
        }

        if ($from === 'Completed') {
            return back()->withErrors(['status' => "Completed orders can't be reopened."]);
        }

        $order->update(['status' => $to]);

        // Cash is handed over when the order is claimed, so it counts as paid at that moment.
        $wasPaid = $order->isPaid();
        if ($to === Order::CLAIMED) {
            $order->markCashPaid();
        }

        DB::table('order_status_logs')->insert([
            'order_id' => $order->id,
            'changed_by' => $request->user()->id,
            'from_status' => $from,
            'to_status' => $to,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $tag = Activity::tag($order->id);
        $adminId = $request->user()->id;

        Activity::log('order.status', "Order {$tag}: {$from} → {$to}", $order, $adminId, ['from' => $from, 'to' => $to]);

        if (! $wasPaid && $order->isPaid()) {
            Activity::log('payment.cash', 'Cash '.Activity::money($order->amount_due)." received for order {$tag} (on claim)", $order, $adminId);
        }

        $message = match ($to) {
            'In Progress' => 'We started working on your laundry.',
            Order::READY => $order->fulfillment === Order::DROPOFF ? 'Your laundry is ready for pickup at the shop.' : 'Your laundry is ready and will be prepared for delivery.',
            'Out for Delivery' => 'Your laundry is on the way to your address.',
            Order::CLAIMED => 'Order claimed. Thank you for choosing us!',
            default => "Your order is now {$to}.",
        };
        // Delivery remains in Ongoing until it is actually delivered (Completed).
        $finished = $to === Order::CLAIMED
            || ($to === Order::READY && $order->fulfillment === Order::DROPOFF);
        Activity::notifyUser($order->user, "Order {$tag} is now {$to}", $message, $finished ? '/orders?view=finished' : '/orders', $order->id);

        return back()->with('success', 'Order #'.str_pad($order->id, 4, '0', STR_PAD_LEFT)." is now {$to}.");
    }

    // The admin collected the cash early (or wants to record it by hand).
    public function markPaid(Request $request, Order $order)
    {
        if ($order->payment_method !== Order::CASH) {
            return back()->withErrors(['payment' => 'Only cash orders can be marked as paid by hand. GCash orders are marked when the customer pays.']);
        }

        $wasPaid = $order->isPaid();
        $order->markCashPaid();

        if (! $wasPaid && $order->isPaid()) {
            $tag = Activity::tag($order->id);
            Activity::log('payment.cash', 'Cash '.Activity::money($order->amount_due)." received for order {$tag}", $order, $request->user()->id);
            Activity::notifyUser($order->user, "Payment recorded for {$tag}", 'We received your cash payment of '.Activity::money($order->amount_due).'.', '/orders', $order->id);
        }

        return back()->with('success', 'Order #'.str_pad($order->id, 4, '0', STR_PAD_LEFT).' marked as paid.');
    }
}
