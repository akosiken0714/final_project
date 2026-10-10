<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The archive idea was replaced by the Ongoing / Finished tabs.
// If the earlier archive migration was run, this removes its columns. If it never ran, this does nothing.
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('orders', 'archived_by_admin_at')) {
            return;
        }

        Schema::table('orders', function (Blueprint $t) {
            $t->dropIndex(['status', 'archived_by_admin_at']);
            $t->dropIndex(['user_id', 'status', 'archived_by_customer_at']);
        });

        Schema::table('orders', function (Blueprint $t) {
            $t->dropColumn(['archived_by_admin_at', 'archived_by_customer_at']);
        });
    }

    public function down(): void
    {
        // intentionally empty: the archive feature no longer exists
    }
};
