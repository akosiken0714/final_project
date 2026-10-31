<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            // delivery = we collect and bring it back; dropoff = the customer brings and collects it at the shop
            $t->string('fulfillment')->default('delivery')->after('address');
            $t->decimal('lat', 10, 7)->nullable()->after('fulfillment');
            $t->decimal('lng', 10, 7)->nullable()->after('lat');
            $t->decimal('distance_km', 6, 2)->nullable()->after('lng');
            $t->decimal('delivery_fee', 8, 2)->default(0)->after('distance_km');

            $t->string('payment_method')->default('cash')->after('delivery_fee');
            $t->string('payment_status')->default('unpaid')->after('payment_method');
            $t->string('payment_reference')->nullable()->after('payment_status');
            $t->timestamp('paid_at')->nullable()->after('payment_reference');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn([
                'fulfillment', 'lat', 'lng', 'distance_km', 'delivery_fee',
                'payment_method', 'payment_status', 'payment_reference', 'paid_at',
            ]);
        });
    }
};
