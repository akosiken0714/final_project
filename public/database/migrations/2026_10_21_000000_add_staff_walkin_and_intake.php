<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Batches 2, 3 and 4 (walk-in orders, staff role, intake record).
//   users.email        -> may now be empty, because a walk-in customer at the counter often has no email
//                         (they can never log in; the shop handles their orders for them)
//   orders.source      -> 'online' (customer placed it on the site) or 'walk_in' (staff created it at the counter)
//   orders.created_by  -> which staff member created a walk-in order (empty for online orders)
//   order_intakes      -> what was received at the counter: item count, condition notes, optional photo
// The staff role needs NO column: it is just the value 'staff' in users.role.
// Every step checks first, so it is safe to run even if you already ran database/sql/staff_walkin_intake.sql.
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'email')) {
            Schema::table('users', function (Blueprint $t) {
                $t->string('email')->nullable()->change();
            });
        }

        Schema::table('orders', function (Blueprint $t) {
            if (! Schema::hasColumn('orders', 'source')) {
                $t->string('source', 20)->default('online');
            }
            if (! Schema::hasColumn('orders', 'created_by')) {
                $t->unsignedBigInteger('created_by')->nullable()->index();
            }
        });

        if (! Schema::hasTable('order_intakes')) {
            Schema::create('order_intakes', function (Blueprint $t) {
                $t->id();
                $t->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
                $t->unsignedSmallInteger('item_count');
                $t->string('notes', 500)->nullable();
                $t->string('photo')->nullable();
                $t->unsignedBigInteger('received_by')->nullable();
                $t->timestamp('received_at')->nullable();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_intakes');

        Schema::table('orders', function (Blueprint $t) {
            foreach (['source', 'created_by'] as $col) {
                if (Schema::hasColumn('orders', $col)) {
                    $t->dropColumn($col);
                }
            }
        });

        // Only make the email required again if nobody (a walk-in customer) is without one.
        if (Schema::hasColumn('users', 'email') && ! \Illuminate\Support\Facades\DB::table('users')->whereNull('email')->exists()) {
            Schema::table('users', function (Blueprint $t) {
                $t->string('email')->nullable(false)->change();
            });
        }
    }
};
