<?php

namespace App\Services\Payments;

use App\Models\Order;
use Illuminate\Support\Str;

// Pretend GCash. It checks the number looks right and the demo code matches, then says "paid".
// No money moves and nothing leaves the server.
class DemoGcashGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'demo';
    }

    /**
     * @param  array<string, mixed>  $details
     */
    public function charge(Order $order, array $details): PaymentResult
    {
        $number = preg_replace('/\D/', '', (string) ($details['gcash_number'] ?? ''));
        $masked = strlen($number) === 11 ? substr($number, 0, 4).'****'.substr($number, -3) : null;

        if (! preg_match('/^09\d{9}$/', $number)) {
            return new PaymentResult(false, null, $masked, 'Enter a valid GCash number (09XXXXXXXXX).');
        }

        if (! hash_equals((string) config('laundry.payments.demo_code'), (string) ($details['code'] ?? ''))) {
            return new PaymentResult(false, null, $masked, 'That code is not correct. Please try again.');
        }

        return new PaymentResult(true, 'DEMO-'.strtoupper(Str::random(8)), $masked, 'Payment received (demo).');
    }
}
