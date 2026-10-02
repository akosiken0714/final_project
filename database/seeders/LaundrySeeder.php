<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class LaundrySeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $pass = env('ADMIN_PASSWORD');

        if ($email && $pass) {
            Validator::make(['email' => $email, 'password' => $pass], [
                'email' => ['email'],
                'password' => [Password::min(12)->mixedCase()->numbers()->symbols()],
            ])->validate();

            User::firstOrNew(['email' => $email])->forceFill([
                'name' => 'Admin',
                'password' => $pass,
                'role' => 'admin',
                'email_verified_at' => now(),
            ])->save();
        } else {
            $this->command?->warn('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env to create the admin.');
        }

        $services = [
            ['Wash, Dry & Fold', 'kg', 45],
            ['Dry Clean', 'load', 250],
            ['Wash Only', 'kg', 30],
            ['Comforter / Bedding', 'load', 180],
        ];

        foreach ($services as [$name, $unit, $price]) {
            Service::firstOrCreate(['name' => $name], ['unit' => $unit, 'price' => $price]);
        }
    }
}