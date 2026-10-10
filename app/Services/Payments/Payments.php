<?php

namespace App\Services\Payments;

use RuntimeException;

class Payments
{
    // The gateway chosen by PAYMENT_DRIVER in .env.
    // To take real GCash payments later: write a class that implements PaymentGateway, add it below, change the .env value.
    public static function gateway(): PaymentGateway
    {
        return match (config('laundry.payments.driver')) {
            'demo' => new DemoGcashGateway(),
            default => throw new RuntimeException('Unknown payment driver: ' . config('laundry.payments.driver')),
        };
    }

    public static function isDemo(): bool
    {
        return config('laundry.payments.driver') === 'demo';
    }
}
