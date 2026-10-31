<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('name', 40);
            $t->foreignId('service_id')->constrained();
            $t->unsignedSmallInteger('quantity');
            $t->string('address');
            $t->text('instructions')->nullable();
            $t->timestamps();

            $t->unique(['user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_orders');
    }
};
