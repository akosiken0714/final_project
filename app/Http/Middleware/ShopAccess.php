<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// The order desk is for the shop team: staff (cashiers) AND admins.
// Pages that show money totals, accounts or settings stay behind the stricter AdminOnly ("admin").
class ShopAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->isShop(), 403);

        // On the live site an admin must use 2FA. Staff only need it if you set STAFF_REQUIRE_2FA=true.
        $needsTwoFactor = $user->isAdmin() || (bool) config('laundry.staff_require_2fa', false);

        if ($needsTwoFactor && app()->environment('production') && ! $user->two_factor_confirmed_at) {
            return redirect('/settings/security');
        }

        return $next($request);
    }
}
