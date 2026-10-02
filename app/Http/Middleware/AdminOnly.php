<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminOnly
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user?->role === 'admin', 403);

        // Admins must use 2FA on the live site. Skipped while building locally.
        if (app()->environment('production') && ! $user->two_factor_confirmed_at) {
            return redirect('/settings/security');
        }

        return $next($request);
    }
}