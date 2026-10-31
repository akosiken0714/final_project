<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Safe browser headers on every page. (No strict Content-Security-Policy on purpose: the map
// loads tiles and place search from OpenStreetMap, and Vite needs room to work in development.)
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Camera and microphone off. Location is allowed on our own pages (for "Use my location").
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

        if ($request->isSecure() && app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
