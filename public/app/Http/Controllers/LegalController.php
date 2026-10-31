<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

// Privacy, Terms and Refund pages. Public (no login). Wording lives in resources/js/pages/legal.tsx.
// A controller (not an inline function) so `php artisan route:cache` works.
class LegalController extends Controller
{
    private const PAGES = ['privacy', 'terms', 'refund'];

    public function show(string $page): Response
    {
        abort_unless(in_array($page, self::PAGES, true), 404);

        return Inertia::render('legal', ['page' => $page]);
    }
}
