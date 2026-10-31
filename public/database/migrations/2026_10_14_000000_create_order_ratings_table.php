<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One rating per order: 1 to 5 stars and an optional comment from the customer.
        // "demo" marks sample ratings made by `php artisan laundry:demo-ratings`, so they can be wiped
        // without ever touching a real customer's rating.
        Schema::create('order_ratings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->unsignedTinyInteger('stars');
            $t->text('comment')->nullable();
            $t->boolean('demo')->default(false);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_ratings');
    }
};
