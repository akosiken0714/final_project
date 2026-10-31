<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderRating;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

// A customer rates one of their finished orders: 1 to 5 stars and an optional comment.
// Rating again simply updates the earlier rating, so there is only ever one per order.
class RatingController extends Controller
{
    public function store(Request $request, Order $order): RedirectResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        if (! Schema::hasTable('order_ratings')) {
            return back()->withErrors(['rating' => 'Ratings are not switched on yet. Please try again later.']);
        }

        if ($order->status !== Order::CLAIMED) {
            return back()->withErrors(['rating' => 'You can rate an order once it is completed.']);
        }

        $data = $request->validate([
            'stars' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:'.OrderRating::MAX_COMMENT],
        ]);

        $comment = trim((string) ($data['comment'] ?? ''));

        OrderRating::updateOrCreate(
            ['order_id' => $order->id],
            ['user_id' => $request->user()->id, 'stars' => (int) $data['stars'], 'comment' => $comment !== '' ? $comment : null, 'demo' => false],
        );

        return back()->with('success', 'Thank you for your feedback!');
    }
}
