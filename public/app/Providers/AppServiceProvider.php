<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Passwords: at least 8 characters with a BIG letter, a small letter and a number. No symbols needed.
        // - Live site: also refuses passwords that appeared in known data leaks (needs internet).
        // - Your own computer (local): same rules, so what you test is what customers get.
        // - Automated tests: Laravel's light default (8 characters), because older tests use simple passwords.
        Password::defaults(function (): ?Password {
            if (app()->runningUnitTests()) {
                return null;
            }

            return self::strongPassword(checkLeaks: app()->isProduction());
        });
    }

    /**
     * The password rule customers must follow (kept in one place so the tests use the real thing).
     */
    public static function strongPassword(bool $checkLeaks = false): Password
    {
        $rule = Password::min(8)->mixedCase()->numbers();

        return $checkLeaks ? $rule->uncompromised() : $rule;
    }
}
