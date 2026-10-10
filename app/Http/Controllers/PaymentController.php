<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\Payments;
use App\Support\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

// The pay screen for GCash orders. Right now it talks to the demo gateway (no real money).
class PaymentController extends Controller
{
    public function show(Request $request, Order $order)
    {
        $this->mine($request, $order);

        return Inertia::render('Orders/Pay', [
            'order' => $order->load('service'),
            'demo' => Payments::isDemo(),
            // Only the demo screen shows its code, so people can try it. A real gateway never would.
            'demoCode' => Payments::isDemo() ? (string) config('laundry.payments.demo_code') : null,
        ]);
    }

    public function pay(Request $request, Order $order)
    {
        $this->mine($request, $order);

        if ($order->isPaid()) {
            return redirect('/orders')->with('success', 'That order is already paid.');
        }

        $details = $request->validate([
            'gcash_number' => ['required', 'regex:/^09\d{9}$/'],
            'code' => ['required', 'digits:6'],
        ], [
            'gcash_number.regex' => 'Enter a valid GCash number (09XXXXXXXXX).',
            'code.digits' => 'The code is 6 digits.',
        ]);

        $gateway = Payments::gateway();
        $result = $gateway->charge($order, $details);

        DB::transaction(function () use ($order, $request, $gateway, $result) {
            Payment::create([
                'order_id' => $order->id,
                'user_id' => $request->user()->id,
                'method' => Order::GCASH,
                'driver' => $gateway->name(),
                'amount' => $order->amount_due,
                'status' => $result->success ? 'success' : 'failed',
                'reference' => $result->reference,
                'masked_number' => $result->maskedNumber,
                'failure_reason' => $result->success ? null : $result->message,
            ]);

            if ($result->success) {
                $order->update([
                    'payment_status' => Order::PAID,
                    'paid_at' => now(),
                    'payment_reference' => $result->reference,
                ]);
            }
        });

        $tag = Activity::tag($order->id);
        $amount = Activity::money($order->amount_due);
        if ($result->success) {
            Activity::log('payment.gcash', "GCash {$amount} paid for order {$tag}", $order, $request->user()->id, ['reference' => $result->reference]);
            Activity::notifyAdmins('Payment received', "Order {$tag}: {$amount} via GCash", '/admin', $order->id);
        } else {
            Activity::log('payment.failed', "GCash payment failed for order {$tag}", $order, $request->user()->id);
        }

        if (! $result->success) {
            throw ValidationException::withMessages(['code' => $result->message]);
        }

        return redirect('/orders')->with('success', 'Payment received! Reference '.$result->reference.'.');
    }

    // Only the customer who placed a GCash order can open its pay screen.
    private function mine(Request $request, Order $order): void
    {
        abort_unless($order->user_id === $request->user()->id && $order->payment_method === Order::GCASH, 404);
    }
}
