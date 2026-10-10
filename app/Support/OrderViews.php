<?php

namespace App\Support;

use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

// Builds the two lists on the admin and customer order pages:
//   Ongoing = Pending + In Progress, plus delivery orders that are out for delivery
//   Finished = Ready for Pickup + Completed orders
class OrderViews
{
    public const VIEWS = ['ongoing', 'finished'];

    private const STEP = 10;

    private const MAX = 200;

    /**
     * @param  Builder<Order>  $base  every order this person is allowed to see
     * @param  array<int, string>  $with  relations to load
     */
    public static function resolve(Request $request, Builder $base, array $with = [], bool $customerView = false): array
    {
        $view = in_array($request->query('view'), self::VIEWS, true) ? $request->query('view') : 'ongoing';
        $limit = min(self::MAX, max(self::STEP, (int) $request->query('limit', self::STEP)));

        $newest = fn (Builder $q) => $q->with($with)->latest()->orderByDesc('id');
        $hasMore = false;

        if ($view === 'ongoing') {
            $ongoingQuery = clone $base;
            if ($customerView) {
                $ongoingQuery->where(function (Builder $q) {
                    $q->whereIn('status', Order::ONGOING)
                        ->orWhere(function (Builder $delivery) {
                            $delivery->where('fulfillment', Order::DELIVERY)
                                ->where('status', 'Out for Delivery');
                        });
                });
            } else {
                $ongoingQuery->ongoing();
            }
            $orders = $newest($ongoingQuery)->get();
        } else {
            $readyQuery = (clone $base)->where('status', Order::READY);
            if (! $customerView) {
            }
            $ready = $newest($readyQuery)->get();

            // One extra row just to know if a "Load more" button is needed.
            $rows = $newest((clone $base)->where('status', Order::CLAIMED))->limit($limit + 1)->get();
            $hasMore = $rows->count() > $limit && $limit < self::MAX;

            $orders = $ready->concat($rows->take($limit))->values();
        }

        $by = (clone $base)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $ongoing = (int) (($by['Pending'] ?? 0) + ($by['In Progress'] ?? 0));
        $ready = (int) ($by[Order::READY] ?? 0);
        if ($customerView) {
            $ongoing += (clone $base)->where('fulfillment', Order::DELIVERY)
                ->where('status', 'Out for Delivery')->count();
        } else {
        }
        $claimed = (int) ($by[Order::CLAIMED] ?? 0);

        return [
            'orders' => $orders,
            'view' => $view,
            'hasMore' => $hasMore,
            'nextLimit' => min(self::MAX, $limit + self::STEP),
            'counts' => [
                'ongoing' => $ongoing,
                'finished' => $ready + $claimed,
                'ready' => $ready,
                'claimed' => $claimed,
            ],
        ];
    }
}
