<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            // Profile picture (stored privately, shown through /avatars/{user}).
            $t->string('avatar_path')->nullable();
            // The customer's usual pickup/delivery spot, so they don't pin the map every time.
            $t->decimal('default_lat', 10, 7)->nullable();
            $t->decimal('default_lng', 10, 7)->nullable();
            // "Blue gate, call when you arrive"
            $t->string('delivery_notes', 200)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->dropColumn(['avatar_path', 'default_lat', 'default_lng', 'delivery_notes']);
        });
    }
};
