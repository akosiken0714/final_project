<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One line per thing that happened (order placed, status changed, payment, price change...).
        if (! Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('user_id')->nullable()->index();  // who did it (no foreign key, so history survives deleted users)
                $t->unsignedBigInteger('order_id')->nullable()->index();
                $t->string('event', 40)->index();                         // order.placed, order.status, payment.cash ...
                $t->string('summary', 255);                               // the sentence shown on the History page
                $t->json('meta')->nullable();
                $t->timestamp('created_at')->useCurrent()->index();
            });
        }

        // Laravel's standard table for in-app notifications (the bell).
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $t) {
                $t->uuid('id')->primary();
                $t->string('type');
                $t->morphs('notifiable');
                $t->text('data');
                $t->timestamp('read_at')->nullable();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('notifications');
    }
};
