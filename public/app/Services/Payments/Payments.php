<?php

namespace App\Services\Payments;

use RuntimeException;

class Payments
{
    // Drivers this app knows how to run. Add your real gateway's name here when you write it.
    public const KNOWN_DRIVERS = ['demo'];

    // The pretend-GCash demo may only run on these environments. It can never run on a live site.
    public const DEMO_ENVIRONMENTS = ['local', 'testing'];

    // The gateway chosen by PAYMENT_DRIVER in .env.
    // To take real GCash payments later: write a class that implements PaymentGateway, add it below
    // (and to KNOWN_DRIVERS), change the .env value.
    public static function gateway(): PaymentGateway
    {
        if (! self::enabled()) {
            throw new RuntimeException('Online payment is not available on this environment.');
        }

        return match (self::driver()) {
            'demo' => new DemoGcashGateway,
            default => throw new RuntimeException('Unknown payment driver: '.self::driver()),
        };
    }

    public static function driver(): string
    {
        return (string) config('laundry.payments.driver');
    }

    // True when the pretend-GCash driver is selected (used for "demo" labels on screen).
    public static function isDemo(): bool
    {
        return self::driver() === 'demo';
    }

    // Can customers pay online right now? False when the driver is unknown, or when it is the
    // demo driver on a live (non local/testing) environment.
    public static function enabled(): bool
    {
        if (! in_array(self::driver(), self::KNOWN_DRIVERS, true)) {
            return false;
        }

        if (self::isDemo() && ! app()->environment(self::DEMO_ENVIRONMENTS)) {
            return false;
        }

        return true;
    }
}
