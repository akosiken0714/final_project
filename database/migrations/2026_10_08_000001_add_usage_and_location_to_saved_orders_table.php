<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('saved_orders', function (Blueprint $t) {
            $t->timestamp('last_used_at')->nullable()->after('instructions');
            $t->string('fulfillment')->default('delivery')->after('address');
            $t->decimal('lat', 10, 7)->nullable()->after('fulfillment');
            $t->decimal('lng', 10, 7)->nullable()->after('lat');
        });

        // Orders saved before this change start with "last used" = when they were last saved.
        DB::table('saved_orders')->update(['last_used_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('saved_orders', function (Blueprint $t) {
            $t->dropColumn(['last_used_at', 'fulfillment', 'lat', 'lng']);
        });
    }
};
