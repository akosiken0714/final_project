<?php

namespace App\Http\Controllers;

use App\Models\OrderRating;
use App\Models\Service;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

// The landing page. (A controller instead of an inline function so `php artisan route:cache` works.)
class HomeController extends Controller
{
    // The most reviews the landing page will ever receive, and the longest comment shown on a card.
    // (LandingReviews.tsx has SHOWN_AT_FIRST: how many of these are visible before "Show more reviews" is pressed.)
    private const REVIEW_LIMIT = 6;

    private const COMMENT_MAX_CHARS = 140;

    public function __invoke(): Response
    {
        $reviews = [];
        $summary = ['average' => null, 'count' => 0, 'breakdown' => [0, 0, 0, 0, 0]];

        // The ratings table only exists after `php artisan migrate`; until then the page just skips reviews.
        if (Schema::hasTable('order_ratings')) {
            $count = OrderRating::count();

            if ($count > 0) {
                $perStar = OrderRating::selectRaw('stars, count(*) as c')->groupBy('stars')->pluck('c', 'stars');

                $summary = [
                    'average' => round((float) OrderRating::avg('stars'), 1),
                    'count' => $count,
                    // How many gave 5, 4, 3, 2 and 1 stars (in that order), for the bars on the page.
                    'breakdown' => array_map(fn (int $n) => (int) ($perStar[$n] ?? 0), [5, 4, 3, 2, 1]),
                ];
            }

            // Only real written comments with 4 or 5 stars are shown, newest first, first name + last initial only.
            $reviews = OrderRating::with('user')
                ->where('stars', '>=', 4)
                ->whereNotNull('comment')
                ->where('comment', '!=', '')
                ->latest()
                ->limit(self::REVIEW_LIMIT)
                ->get()
                ->map(fn (OrderRating $r) => [
                    'id' => $r->id,
                    'stars' => $r->stars,
                    'comment' => Str::limit(trim($r->comment), self::COMMENT_MAX_CHARS),
                    'name' => self::shortName($r->user?->name),
                    'when' => $r->created_at?->format('M Y'),
                ])
                ->all();
        }

        return Inertia::render('welcome', [
            'services' => Service::where('active', true)->get(),
            'reviews' => $reviews,
            'reviewSummary' => $summary,
        ]);
    }

    // "Maria Dela Cruz" becomes "Maria C." so customers are not fully named on a public page.
    private static function shortName(?string $name): string
    {
        $parts = preg_split('/\s+/', trim((string) $name), -1, PREG_SPLIT_NO_EMPTY);

        if (! $parts) {
            return 'PhineWash customer';
        }

        return count($parts) > 1
            ? $parts[0].' '.mb_strtoupper(mb_substr(end($parts), 0, 1)).'.'
            : $parts[0];
    }
}
