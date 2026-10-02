<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->softDeletes());

        Schema::table('orders', fn (Blueprint $t) => $t->string('address')->nullable()->after('instructions'));

        Schema::create('order_status_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('changed_by')->nullable();
            $t->string('from_status');
            $t->string('to_status');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_logs');
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn('address'));
        Schema::table('users', fn (Blueprint $t) => $t->dropSoftDeletes());
    }
};