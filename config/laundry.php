<?php

// Shop, delivery zone and payment settings. Everything here can be overridden in .env.
return [

    'shop' => [
        'name' => env('SHOP_NAME', 'PhineWash Laundry Services'),
        // Shown to drop-off customers so they know where to go.
        'address' => env('SHOP_ADDRESS', 'Poblacion, Anahawan, Southern Leyte'),
        // Approximate centre of Poblacion, Anahawan. Set SHOP_LAT / SHOP_LNG in .env to the exact spot of the shop.
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

    // The first admin account, created by `php artisan db:seed`. Set both in .env.
    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

    'payments' => [
        // "demo" = pretend GCash (no real money). To go live, add a gateway class and map it in
        // App\Services\Payments\Payments::gateway(), then set PAYMENT_DRIVER in .env.
        'driver' => env('PAYMENT_DRIVER', 'demo'),

        // The code the demo GCash screen accepts (stands in for the real GCash PIN/OTP).
        'demo_code' => env('PAYMENT_DEMO_CODE', '123456'),
    ],

];
