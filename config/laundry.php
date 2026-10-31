<?php

// Shop, delivery zone and payment settings. Everything here can be overridden in .env.
return [

    'shop' => [
        'name' => env('SHOP_NAME', 'PhineWash Laundry Services'),
        // Shown to drop-off customers so they know where to go.
        'address' => env('SHOP_ADDRESS', 'Poblacion, Anahawan, Southern Leyte'),
        // Approximate centre of Poblacion, Anahawan. Set SHOP_LAT / SHOP_LNG in .env to the exact spot of the shop.
        // The "usually ready within" time shown at checkout. A plain promise from the shop, not a calculation.
        'ready_hours' => (int) env('LAUNDRY_READY_HOURS', 24),
        'lat' => (float) env('SHOP_LAT', 10.2667),
        'lng' => (float) env('SHOP_LNG', 125.0167),
    ],

    'delivery' => [
        // Straight-line distance from the shop. Anything farther gets "we can't deliver to this location".
        'max_km' => (float) env('DELIVERY_MAX_KM', 5),

        // Delivery fee by distance: the first row whose "km" is not exceeded wins. Starts at PHP 20.
        'tiers' => [
            ['km' => 2, 'fee' => 20],
            ['km' => 3.5, 'fee' => 40],
            ['km' => 5, 'fee' => 60],
        ],
    ],

    // Staff (cashier) accounts. Admins must use 2FA on the live site; staff only if you turn this on.
    'staff_require_2fa' => (bool) env('STAFF_REQUIRE_2FA', false),

    // The first admin account, created by `php artisan db:seed`. Set both in .env.
    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

    'payments' => [
        // "demo" = pretend GCash (no real money). The demo driver ONLY works when APP_ENV is "local" or
        // "testing"; on a live site it is switched off and customers can only choose cash.
        // To go live with real GCash: add a gateway class, map it in App\Services\Payments\Payments::gateway()
        // and Payments::KNOWN_DRIVERS, then set PAYMENT_DRIVER in .env.
        'driver' => env('PAYMENT_DRIVER', 'demo'),

        // The code the demo GCash screen accepts. It has a built-in default ONLY on local/testing.
        // On any other environment it stays empty unless you set PAYMENT_DEMO_CODE yourself.
        'demo_code' => env(
            'PAYMENT_DEMO_CODE',
            in_array(env('APP_ENV', 'production'), ['local', 'testing'], true) ? '123456' : null,
        ),
    ],

    // The yardsticks the printed admin report uses to say "going well" or "needs attention".
    // They are sensible starting points for a small laundry shop: change them to match your own goals.
    'report' => [
        'ready_wait_hours' => (float) env('REPORT_READY_WAIT_HOURS', 24),          // an order sitting Ready for Pickup longer than this is flagged as not picked up
        'turnaround_good_hours' => (float) env('REPORT_TURNAROUND_GOOD_HOURS', 24), // order -> ready at or under this = quick
        'turnaround_slow_hours' => (float) env('REPORT_TURNAROUND_SLOW_HOURS', 48), // over this = too slow
        'pending_wait_hours' => (float) env('REPORT_PENDING_WAIT_HOURS', 12),       // a new order waiting longer than this needs a start
        'rating_good' => (float) env('REPORT_RATING_GOOD', 4.0),                    // average stars at or above this = happy customers
        'rating_low' => (float) env('REPORT_RATING_LOW', 3.5),                      // average stars below this = a problem to look into
        'rating_response_pct' => (float) env('REPORT_RATING_RESPONSE_PCT', 30),     // share of finished orders that should get rated
        'unpaid_share_pct' => (float) env('REPORT_UNPAID_SHARE_PCT', 20),           // unpaid money above this share of sales is worth chasing
        'repeat_good_pct' => (float) env('REPORT_REPEAT_GOOD_PCT', 50),             // returning customers at or above this = good loyalty
        'change_pct' => (float) env('REPORT_CHANGE_PCT', 10),                       // sales moving more than this vs the last period is called out
    ],

];
