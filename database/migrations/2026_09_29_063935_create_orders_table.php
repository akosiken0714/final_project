<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('service_id')->constrained();
            $t->decimal('quantity', 8, 2);
            $t->decimal('total', 10, 2);
            $t->text('instructions')->nullable();
            $t->string('photo')->nullable();
            $t->string('status')->default('Pending');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};