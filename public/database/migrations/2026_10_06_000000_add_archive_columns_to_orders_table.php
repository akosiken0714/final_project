<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Archiving only hides a finished order from one side's list. Nothing is deleted,
    // so analytics, revenue and "total spent" keep working. Each side hides separately.
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->timestamp('archived_by_admin_at')->nullable()->after('status');
            $t->timestamp('archived_by_customer_at')->nullable()->after('archived_by_admin_at');
            $t->index(['status', 'archived_by_admin_at']);
            $t->index(['user_id', 'status', 'archived_by_customer_at']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->dropIndex(['status', 'archived_by_admin_at']);
            $t->dropIndex(['user_id', 'status', 'archived_by_customer_at']);
            $t->dropColumn(['archived_by_admin_at', 'archived_by_customer_at']);
        });
    }
};
