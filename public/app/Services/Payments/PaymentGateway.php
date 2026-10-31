<?php

namespace App\Services\Payments;

use App\Models\Order;

// Anything that can take a payment for an order. The demo GCash gateway is one; a real one (PayMongo, Xendit,
// GCash direct...) is just another class with the same two methods.
interface PaymentGateway
{
    // Short name saved on each payment row ("demo", "paymongo"...).
    public function name(): string;

    // Try to charge the order's amount due. $details is whatever the pay screen collected (number, code...).
    /**
     * @param  array<string, mixed>  $details
     */
    public function charge(Order $order, array $details): PaymentResult;
}
