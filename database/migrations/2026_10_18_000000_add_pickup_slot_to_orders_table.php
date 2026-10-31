<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Optional "when": the day (and morning/afternoon) the customer wants us to collect the laundry,
// or when they plan to drop it off. Both columns are nullable so every existing order keeps working.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->date('pickup_date')->nullable();
            $t->string('pickup_slot')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['pickup_date', 'pickup_slot']);
        });
    }
};
