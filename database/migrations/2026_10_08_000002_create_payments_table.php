<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per payment attempt (successful or not), so the shop can always see what happened.
        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->string('method');                      // cash | gcash
            $t->string('driver')->nullable();          // demo | (a real gateway later)
            $t->decimal('amount', 10, 2);
            $t->string('status');                      // success | failed
            $t->string('reference')->nullable();
            $t->string('masked_number')->nullable();   // 0917****123 - never the full number
            $t->string('failure_reason')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
