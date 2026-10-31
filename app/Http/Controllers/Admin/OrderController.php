<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Support\Activity;
use App\Support\OrderViews;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    // The admin dashboard: quick numbers, the orders to work on, and the analytics below them.
    public function index(Request $request): Response
    {
        // Optional search: an order number (#0012 or 12) or part of the customer's name, email or phone.
        $search = trim($this->text($request, 'q'));
        // Filters: a status, paid/unpaid, and a created-on date range (YYYY-MM-DD). Anything invalid is ignored.
        $status = $this->text($request, 'status');
        $status = in_array($status, [...Order::STATUSES, Order::CANCELLED], true) ? $status : '';
        $pay = $this->text($request, 'pay');
        $pay = in_array($pay, ['paid', 'unpaid'], true) ? $pay : '';
        $from = $this->dateOrEmpty($request->query('from'));
        $to = $this->dateOrEmpty($request->query('to'));

        $base = Order::query()->when($search !== '', function ($b) use ($search) {
            $like = '%'.str_replace(['%', '_'], '', $search).'%';
            $number = ltrim($search, '#');

            $b->where(function ($w) use ($like, $number) {
                if ($number !== '' && ctype_digit($number)) {
                    $w->orWhere('id', (int) $number);
                }
                $w->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like));
            });
        })
            // Optional filters, all combinable with the search and with the tabs.
            ->when($status !== '', fn ($b) => $b->where('status', $status))
            ->when($pay === 'paid', fn ($b) => $b->where('payment_status', Order::PAID))
            ->when($pay === 'unpaid', fn ($b) => $b->where('payment_status', Order::UNPAID))
            ->when($from !== '', fn ($b) => $b->whereDate('created_at', '>=', $from))
            ->when($to !== '', fn ($b) => $b->whereDate('created_at', '<=', $to));

        // The intake record (batch 4) only exists after `php artisan migrate`, so do not fail before that.
        $with = Schema::hasTable('order_intakes') ? ['user', 'service', 'intake.receiver'] : ['user', 'service'];
        $list = OrderViews::resolve($request, $base, $with);

        // Staff (cashiers) run the order desk but never see the shop's money totals or analytics.
        $isAdmin = $request->user()->isAdmin();

        return Inertia::render('Admin/Orders', $list + [
            'can' => [
                'revenue' => $isAdmin,
                'analytics' => $isAdmin,
                // Cancelling a PAID order means a refund by hand, so only an admin may do it.
                'cancelPaid' => $isAdmin,
            ],
            'search' => $search,
            'filters' => ['status' => $status, 'pay' => $pay, 'from' => $from, 'to' => $to],
            'statuses' => Order::STATUSES,
            'attention' => $this->attention(),
            'stats' => [
                'total' => Order::count(),
                'pending' => Order::where('status', 'Pending')->count(),
                'ready' => Order::where('status', 'Ready for Pickup')->count(),
                'revenue' => $isAdmin ? (float) Order::where('status', Order::CLAIMED)->sum('total') : null,
                // GCash orders that were placed but not paid yet
                'awaitingGcash' => Order::where('payment_method', Order::GCASH)->where('payment_status', Order::UNPAID)->count(),
            ],
            'analytics' => $isAdmin ? app(AnalyticsController::class)->data($request) : null,
        ]);
    }

    // The "needs attention" strip at the top of the dashboard: a few counts with the same yardsticks as the printed report.
    /**
     * @return array<string, int|float>
     */
    private function attention(): array
    {
        $pendingHours = (float) config('laundry.report.pending_wait_hours', 12);
        $readyHours = (float) config('laundry.report.ready_wait_hours', 24);

        return [
            'waiting' => Order::where('status', 'Pending')->where('created_at', '<=', now()->subHours($pendingHours))->count(),
            'waitingHours' => $pendingHours,
            'readyOld' => Order::where('status', Order::READY)->where('updated_at', '<=', now()->subHours($readyHours))->count(),
            'readyHours' => $readyHours,
            // The pickup-day column only exists after `php artisan migrate`, so do not fail before that.
            'pickupsToday' => Schema::hasColumn('orders', 'pickup_date')
                ? Order::whereIn('status', Order::ONGOING)->whereDate('pickup_date', today())->count()
                : 0,
        ];
    }

    // Returns the date if it is a real YYYY-MM-DD date, otherwise an empty string (so the filter is skipped).
    private function dateOrEmpty(mixed $value): string
    {
        $value = is_string($value) ? trim($value) : '';

        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return $value;
        }

        return '';
    }

    public function update(UpdateOrderStatusRequest $request, Order $order): RedirectResponse
    {
        $to = $request->validated()['status'];
        $from = $order->status;

        if ($from === $to) {
            return back();
        }

        if ($from === Order::CANCELLED) {
            return back()->withErrors(['status' => "Cancelled orders can't be reopened."]);
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

        return back()->with('success', 'Order #'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT)." is now {$to}.");
    }

    // The admin collected the cash early (or wants to record it by hand).
    public function markPaid(Request $request, Order $order): RedirectResponse
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

        return back()->with('success', 'Order #'.str_pad((string) $order->id, 4, '0', STR_PAD_LEFT).' marked as paid.');
    }

    // "Weigh & confirm": the customer guessed an amount when ordering, the shop weighs the laundry and enters the real one.
    // The price per unit stays the same as when the order was placed; only the amount (and so the total) changes.
    public function weigh(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.1', 'max:200', 'decimal:0,2'],
        ], [
            'quantity.required' => 'Enter the weight or amount.',
            'quantity.numeric' => 'Enter a number, like 4.6.',
            'quantity.min' => 'The amount must be at least 0.1.',
            'quantity.max' => 'That amount is too large. The most is 200.',
            'quantity.decimal' => 'Use at most 2 decimal places.',
        ]);

        if (in_array($order->status, [Order::CLAIMED, Order::CANCELLED], true)) {
            return back()->withErrors(['quantity' => "A {$order->status} order can't be changed."]);
        }

        // Money already recorded must not silently change. Weigh first, then record payment.
        if ($order->isPaid()) {
            return back()->withErrors(['quantity' => 'This order is already marked paid, so its price cannot change. Weigh orders before recording payment.']);
        }

        $old = (float) $order->quantity;
        $new = round((float) $data['quantity'], 2);

        if (abs($old - $new) < 0.005) {
            return back()->withErrors(['quantity' => 'That is the same amount as now. Nothing changed.']);
        }

        // Keep the price per unit the customer was quoted, even if the service price changed since.
        $unit = $old > 0 ? (float) $order->total / $old : (float) ($order->service?->price ?? 0);
        $oldTotal = (float) $order->total;
        $newTotal = round($unit * $new, 2);

        $order->update([
            'estimated_quantity' => $order->estimated_quantity ?? $old,
            'quantity' => $new,
            'total' => $newTotal,
            'weighed_at' => now(),
        ]);

        $tag = Activity::tag($order->id);
        $label = $order->service?->unit ?: 'unit';
        $fmt = fn (float $n) => rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');

        Activity::log(
            'order.weighed',
            "Order {$tag} weighed: {$fmt($old)} → {$fmt($new)} {$label} · laundry ".Activity::money($oldTotal).' → '.Activity::money($newTotal),
            $order,
            $request->user()->id,
            ['from' => $old, 'to' => $new],
        );

        Activity::notifyUser(
            $order->user,
            "Order {$tag} was weighed",
            "We weighed your laundry: {$fmt($new)} {$label}. Laundry price is now ".Activity::money($newTotal).' (was '.Activity::money($oldTotal).').',
            '/orders',
            $order->id,
        );

        return back()->with('success', "Order {$tag} confirmed at {$fmt($new)} {$label}: ".Activity::money($newTotal).'.');
    }

    // The admin cancels an order that is not finished (the customer vanished, a mistake, the shop can't do it...).
    // A reason is required, because the customer is told why.
    public function cancel(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:200'],
        ], [
            'reason.required' => 'Write a short reason. The customer will see it.',
            'reason.min' => 'Please write a slightly longer reason.',
            'reason.max' => 'Keep the reason under 200 characters.',
        ]);

        if ($order->status === Order::CANCELLED) {
            return back()->withErrors(['reason' => 'This order is already cancelled.']);
        }

        if ($order->status === Order::CLAIMED) {
            return back()->withErrors(['reason' => "A completed order can't be cancelled."]);
        }

        // Money was already taken, so cancelling needs a refund by hand. That decision belongs to an admin.
        if ($order->isPaid() && ! $request->user()->isAdmin()) {
            return back()->withErrors(['reason' => 'This order is already paid, so cancelling it needs a refund. Please ask an admin to cancel it.']);
        }

        $from = $order->status;
        $reason = trim($data['reason']);
        $wasPaid = $order->isPaid();

        $order->update(['status' => Order::CANCELLED, 'cancel_reason' => $reason]);

        DB::table('order_status_logs')->insert([
            'order_id' => $order->id,
            'changed_by' => $request->user()->id,
            'from_status' => $from,
            'to_status' => Order::CANCELLED,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $tag = Activity::tag($order->id);
        $refund = $wasPaid ? ' '.Activity::money($order->amount_due).' was already paid and must be refunded by hand.' : '';

        Activity::log('order.cancelled', "Order {$tag} cancelled by admin: {$reason}.{$refund}", $order, $request->user()->id, ['from' => $from]);

        Activity::notifyUser(
            $order->user,
            "Order {$tag} was cancelled",
            "The shop cancelled this order. Reason: {$reason}".($wasPaid ? ' Please contact the shop about your refund.' : ''),
            '/orders',
            $order->id,
        );

        return back()->with('success', "Order {$tag} cancelled.".($wasPaid ? ' It was already paid, so remember to refund '.Activity::money($order->amount_due).'.' : ''));
    }
}
