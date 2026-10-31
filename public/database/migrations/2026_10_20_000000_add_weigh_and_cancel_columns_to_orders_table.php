<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "Weigh & confirm" and "admin cancel".
//   estimated_quantity = what the customer guessed when ordering (kept when the shop weighs the laundry)
//   weighed_at         = when the shop confirmed the real amount
//   cancel_reason      = why an admin cancelled the order
// All three are nullable, so every existing order keeps working exactly as before.
// The `hasColumn` checks make this safe to run even if you already added the columns with database/sql/weigh_and_cancel.sql.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            if (! Schema::hasColumn('orders', 'estimated_quantity')) {
                $t->decimal('estimated_quantity', 8, 2)->nullable();
            }
            if (! Schema::hasColumn('orders', 'weighed_at')) {
                $t->timestamp('weighed_at')->nullable();
            }
            if (! Schema::hasColumn('orders', 'cancel_reason')) {
                $t->string('cancel_reason', 200)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            foreach (['estimated_quantity', 'weighed_at', 'cancel_reason'] as $col) {
                if (Schema::hasColumn('orders', $col)) {
                    $t->dropColumn($col);
                }
            }
        });
    }
};
