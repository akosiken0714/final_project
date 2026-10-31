<?php

namespace App\Support;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Builds everything the printable admin report shows, in plain words and simple numbers.
//
// The headline numbers (orders, sales, average order) are worked out the SAME way as the dashboard's
// analytics, so the report and the dashboard never disagree:
//   - an order belongs to the period it was PLACED in
//   - "sales" = laundry price of COMPLETED orders (delivery fees are shown separately)
// Money "received" comes from the payments table, like the History page.
class BusinessReport
{
    public const TZ = 'Asia/Manila';

    public const PERIODS = [
        '7' => 'Last 7 days',
        '30' => 'Last 30 days',
        '90' => 'Last 90 days',
        'this_month' => 'This month',
        'last_month' => 'Last month',
        '365' => 'Last 12 months',
    ];

    private const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // An open order that has not changed status for this long is called "stuck" (same rule as the dashboard).
    private const STUCK_HOURS = 48;

    private const FMT = 'Y-m-d H:i:s';

    private string $appTz;

    public function __construct()
    {
        $this->appTz = (string) config('app.timezone');
    }

    /**
     * @return array<string, mixed>
     */
    public function build(string $period): array
    {
        $period = array_key_exists($period, self::PERIODS) ? $period : '30';
        [$start, $end, $prevStart, $prevEnd] = $this->windows($period);

        $rows = $this->orders($start, $end);
        $prevRows = $this->orders($prevStart, $prevEnd);

        $cur = $this->totals($rows);
        $prev = $this->totals($prevRows);

        $received = $this->received($start, $end);
        $unpaid = $this->unpaid($start, $end);
        $pipeline = $this->pipeline($rows);
        $services = $this->services($rows);
        $customers = $this->customers($rows, $start);
        [$weekdays, $peak] = $this->busyTimes($rows);
        $ratings = $this->ratings($start, $end, $cur['completed']);
        $prevRatings = $this->ratings($prevStart, $prevEnd, $prev['completed']);
        $speed = $this->speed($start, $end);
        $stuck = $this->stuck();

        $summary = [
            'orders' => $cur['orders'],
            'ordersDelta' => $this->delta($cur['orders'], $prev['orders']),
            'completed' => $cur['completed'],
            'completionRate' => $cur['orders'] ? (int) round($cur['completed'] / $cur['orders'] * 100) : null,
            'sales' => round($cur['revenue'], 2),
            'salesDelta' => $this->delta($cur['revenue'], $prev['revenue']),
            'average' => $cur['average'],
            'averageDelta' => $this->delta($cur['average'], $prev['average']),
            'rating' => $ratings['average'],
            'ratingDelta' => $ratings['average'] !== null && $prevRatings['average'] !== null
                ? round($ratings['average'] - $prevRatings['average'], 1)
                : null,
            'ratingCount' => $ratings['count'],
        ];

        $facts = [
            'summary' => $summary,
            'cur' => $cur,
            'unpaid' => $unpaid,
            'speed' => $speed,
            'stuck' => $stuck,
            'services' => $services,
            'customers' => $customers,
            'ratings' => $ratings,
        ];

        return [
            'period' => $period,
            'periods' => self::PERIODS,
            'periodLabel' => self::PERIODS[$period],
            'from' => $start->format('Y-m-d'),
            'to' => $end->format('Y-m-d'),
            'generatedAt' => CarbonImmutable::now(self::TZ)->toIso8601String(),
            'shop' => [
                'name' => (string) config('laundry.shop.name'),
                'address' => (string) config('laundry.shop.address'),
            ],
            'headline' => $this->headline($summary, $start, $end),
            'summary' => $summary,
            'money' => [
                'sales' => round($cur['revenue'], 2),
                'deliveryFees' => round($cur['deliveryFees'], 2),
                'billed' => round($cur['revenue'] + $cur['deliveryFees'], 2),
                'received' => $received,
                'unpaid' => $unpaid,
            ],
            'trend' => $this->trend($rows, $start, $end),
            'pipeline' => $pipeline,
            'fulfillment' => $this->split($rows, 'fulfillment', [Order::DELIVERY => 'We pick up & deliver', Order::DROPOFF => 'Customer drops off & collects']),
            'paymentMethods' => $this->split($rows, 'payment_method', [Order::CASH => 'Cash', Order::GCASH => 'GCash']),
            'speed' => $speed,
            'stuck' => $stuck,
            'services' => $services,
            'customers' => $customers,
            'weekdays' => $weekdays,
            'peak' => $peak,
            'ratings' => $ratings,
            'advice' => $this->advice($facts),
        ];
    }

    /**
     * The chosen period and the one just before it, to compare with.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: CarbonImmutable, 3: CarbonImmutable}
     */
    private function windows(string $period): array
    {
        $now = CarbonImmutable::now(self::TZ);

        if ($period === 'this_month') {
            $start = $now->startOfMonth();
            $end = $now;
            // Compare with the same stretch of last month (1st up to the same moment), not the whole month.
            $prevStart = $start->subMonthNoOverflow();
            $prevEnd = $prevStart->addSeconds($end->getTimestamp() - $start->getTimestamp());
            if ($prevEnd >= $start) {
                $prevEnd = $start->subSecond();
            }

            return [$start, $end, $prevStart, $prevEnd];
        }

        if ($period === 'last_month') {
            $start = $now->startOfMonth()->subMonthNoOverflow();
            $end = $now->startOfMonth()->subSecond();

            return [$start, $end, $start->subMonthNoOverflow(), $start->subSecond()];
        }

        $days = max(1, (int) $period);
        $start = $now->startOfDay()->subDays($days - 1);

        return [$start, $now, $start->subDays($days), $start->subSecond()];
    }

    /**
     * @return Collection<int, object>
     */
    private function orders(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return DB::table('orders')
            ->where('created_at', '>=', $from->setTimezone($this->appTz)->format(self::FMT))
            ->where('created_at', '<=', $to->setTimezone($this->appTz)->format(self::FMT))
            ->get(['id', 'user_id', 'service_id', 'quantity', 'total', 'delivery_fee', 'status', 'fulfillment', 'payment_method', 'payment_status', 'created_at']);
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return array<string, float|int>
     */
    private function totals(Collection $rows): array
    {
        $t = ['orders' => 0, 'completed' => 0, 'revenue' => 0.0, 'deliveryFees' => 0.0, 'sum' => 0.0];

        foreach ($rows as $r) {
            $t['orders']++;
            $t['sum'] += (float) $r->total;
            if ($r->status === Order::CLAIMED) {
                $t['completed']++;
                $t['revenue'] += (float) $r->total;
                $t['deliveryFees'] += (float) $r->delivery_fee;
            }
        }

        $t['average'] = $t['orders'] ? round($t['sum'] / $t['orders'], 2) : 0.0;

        return $t;
    }

    // Money that actually came in during the period (cash + GCash), from the payments table.
    /**
     * @return array<string, float|int>
     */
    private function received(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = DB::table('payments')
            ->where('status', 'success')
            ->where('created_at', '>=', $from->setTimezone($this->appTz)->format(self::FMT))
            ->where('created_at', '<=', $to->setTimezone($this->appTz)->format(self::FMT))
            ->selectRaw('method, sum(amount) as s, count(*) as c')
            ->groupBy('method')
            ->get();

        $out = ['cash' => 0.0, 'gcash' => 0.0, 'total' => 0.0, 'count' => 0];
        foreach ($rows as $r) {
            $key = $r->method === Order::GCASH ? 'gcash' : 'cash';
            $out[$key] += (float) $r->s;
            $out['total'] += (float) $r->s;
            $out['count'] += (int) $r->c;
        }

        return array_map(fn ($v) => is_float($v) ? round($v, 2) : $v, $out);
    }

    // Orders placed in the period that have not been paid yet (laundry + delivery fee).
    /**
     * @return array{count: int, amount: float}
     */
    private function unpaid(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $row = DB::table('orders')
            ->where('created_at', '>=', $from->setTimezone($this->appTz)->format(self::FMT))
            ->where('created_at', '<=', $to->setTimezone($this->appTz)->format(self::FMT))
            ->where('payment_status', Order::UNPAID)
            ->where('status', '!=', 'Cancelled')
            ->selectRaw('count(*) as c, coalesce(sum(total + delivery_fee), 0) as s')
            ->first();

        return ['count' => (int) ($row->c ?? 0), 'amount' => round((float) ($row->s ?? 0), 2)];
    }

    // Where this period's orders are now.
    /**
     * @param  Collection<int, object>  $rows
     * @return array<int, array{status: string, count: int}>
     */
    private function pipeline(Collection $rows): array
    {
        $counts = $rows->countBy('status')->all();

        $out = [];
        foreach (Order::STATUSES as $s) {
            $out[] = ['status' => $s, 'count' => (int) ($counts[$s] ?? 0)];
            unset($counts[$s]);
        }
        // any other status that exists in the data, so nothing is hidden
        foreach ($counts as $s => $c) {
            $out[] = ['status' => (string) $s, 'count' => (int) $c];
        }

        return $out;
    }

    /**
     * @param  Collection<int, object>  $rows
     * @param  array<string, string>  $labels
     * @return array<int, array{label: string, count: int, percent: int}>
     */
    private function split(Collection $rows, string $column, array $labels): array
    {
        $counts = $rows->countBy($column)->all();
        $total = max(1, $rows->count());

        $out = [];
        foreach ($labels as $key => $label) {
            $n = (int) ($counts[$key] ?? 0);
            $out[] = ['label' => $label, 'count' => $n, 'percent' => (int) round($n / $total * 100)];
        }

        return $out;
    }

    // Sales over time: one bar per day for short periods, one per week for longer ones.
    /**
     * @param  Collection<int, object>  $rows
     * @return array{unit: string, points: array<int, array<string, mixed>>}
     */
    private function trend(Collection $rows, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $days = intdiv($end->startOfDay()->getTimestamp() - $start->startOfDay()->getTimestamp(), 86400) + 1;
        $weekly = $days > 31;

        $keyOf = fn (CarbonImmutable $d) => ($weekly ? $d->startOfWeek() : $d->startOfDay())->format('Y-m-d');

        $points = [];
        $cursor = $weekly ? $start->startOfWeek() : $start->startOfDay();
        while ($cursor <= $end) {
            $k = $cursor->format('Y-m-d');
            $points[$k] = ['date' => $k, 'orders' => 0, 'sales' => 0.0];
            $cursor = $cursor->addDays($weekly ? 7 : 1);
        }

        foreach ($rows as $r) {
            $k = $keyOf(CarbonImmutable::parse($r->created_at, $this->appTz)->setTimezone(self::TZ));
            if (! isset($points[$k])) {
                continue;
            }
            $points[$k]['orders']++;
            if ($r->status === Order::CLAIMED) {
                $points[$k]['sales'] += (float) $r->total;
            }
        }

        foreach ($points as $k => $p) {
            $points[$k]['sales'] = round($p['sales'], 2);
        }

        return ['unit' => $weekly ? 'week' : 'day', 'points' => array_values($points)];
    }

    // How long orders take to get ready, from the saved status history (same rule as the dashboard).
    /**
     * @return array{avgHours: float|null, sample: int, oldestPendingHours: float|null}
     */
    private function speed(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = DB::table('order_status_logs as l')
            ->join('orders as o', 'o.id', '=', 'l.order_id')
            ->whereIn('l.to_status', ['Ready for Pickup', 'Ready'])
            ->where('o.created_at', '>=', $from->setTimezone($this->appTz)->format(self::FMT))
            ->where('o.created_at', '<=', $to->setTimezone($this->appTz)->format(self::FMT))
            ->groupBy('o.id', 'o.created_at')
            ->selectRaw('o.created_at as ordered_at, MIN(l.created_at) as ready_at')
            ->get();

        $hours = [];
        foreach ($rows as $r) {
            $s = CarbonImmutable::parse($r->ready_at, $this->appTz)->getTimestamp() - CarbonImmutable::parse($r->ordered_at, $this->appTz)->getTimestamp();
            if ($s >= 0) {
                $hours[] = $s / 3600;
            }
        }

        $oldest = DB::table('orders')->where('status', 'Pending')->min('created_at');
        $waiting = $oldest
            ? round(max(0, CarbonImmutable::now($this->appTz)->getTimestamp() - CarbonImmutable::parse($oldest, $this->appTz)->getTimestamp()) / 3600, 1)
            : null;

        return [
            'avgHours' => $hours ? round(array_sum($hours) / count($hours), 1) : null,
            'sample' => count($hours),
            'oldestPendingHours' => $waiting,
        ];
    }

    // Orders that are open but have not moved for a long time. This is "right now", not tied to the period.
    /**
     * @return array{hours: int, count: int, list: array<int, array<string, mixed>>}
     */
    private function stuck(): array
    {
        $before = now()->subHours(self::STUCK_HOURS)->format(self::FMT);
        $base = DB::table('orders')
            ->whereNotIn('status', ['Completed', 'Cancelled'])
            ->where('updated_at', '<=', $before);

        return [
            'hours' => self::STUCK_HOURS,
            'count' => (clone $base)->count(),
            'list' => (clone $base)->orderBy('updated_at')->limit(5)->get(['id', 'status', 'updated_at'])
                ->map(fn ($o) => [
                    'id' => $o->id,
                    'status' => $o->status,
                    'hours' => (int) round(max(0, now()->getTimestamp() - CarbonImmutable::parse($o->updated_at, $this->appTz)->getTimestamp()) / 3600),
                ])->all(),
        ];
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function services(Collection $rows): array
    {
        $info = Service::withTrashed()->get(['id', 'name', 'unit'])->keyBy('id');
        $total = max(1, $rows->count());

        $list = [];
        foreach ($rows->groupBy('service_id') as $id => $group) {
            $svc = $info->get($id);
            $list[] = [
                'name' => $svc->name ?? 'Removed service',
                'unit' => $svc->unit ?? '',
                'orders' => $group->count(),
                'quantity' => round((float) $group->sum('quantity'), 1),
                'sales' => round((float) $group->where('status', Order::CLAIMED)->sum('total'), 2),
                'share' => (int) round($group->count() / $total * 100),
            ];
        }
        usort($list, fn ($a, $b) => [$b['orders'], $b['sales']] <=> [$a['orders'], $a['sales']]);

        return $list;
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return array<string, mixed>
     */
    private function customers(Collection $rows, CarbonImmutable $start): array
    {
        $ids = $rows->pluck('user_id')->unique()->values()->all();
        if (! $ids) {
            return ['total' => 0, 'new' => 0, 'returning' => 0, 'repeatRate' => null, 'top' => []];
        }

        $firstSeen = DB::table('orders')
            ->whereIn('user_id', $ids)
            ->selectRaw('user_id, MIN(created_at) as first_at')
            ->groupBy('user_id')
            ->pluck('first_at', 'user_id');

        $cut = $start->setTimezone($this->appTz)->format(self::FMT);
        $new = 0;
        foreach ($ids as $uid) {
            if (isset($firstSeen[$uid]) && (string) $firstSeen[$uid] >= $cut) {
                $new++;
            }
        }
        $returning = count($ids) - $new;

        $orders = $rows->countBy('user_id');
        $spent = [];
        foreach ($rows->where('status', Order::CLAIMED)->groupBy('user_id') as $uid => $group) {
            $spent[$uid] = (float) $group->sum('total');
        }
        arsort($spent);
        $topIds = array_keys(array_slice($spent, 0, 5, true));
        $names = $topIds ? User::withTrashed()->whereIn('id', $topIds)->pluck('name', 'id') : collect();

        $top = [];
        foreach ($topIds as $uid) {
            $top[] = [
                'name' => $names[$uid] ?? 'Deleted customer',
                'orders' => (int) ($orders[$uid] ?? 0),
                'spent' => round($spent[$uid], 2),
            ];
        }

        return [
            'total' => count($ids),
            'new' => $new,
            'returning' => $returning,
            'repeatRate' => (int) round($returning / count($ids) * 100),
            'top' => $top,
        ];
    }

    // Which weekdays and hours are busiest (by orders placed).
    /**
     * @param  Collection<int, object>  $rows
     * @return array{0: array<int, array{day: string, orders: int}>, 1: array{day: string|null, hour: string|null}}
     */
    private function busyTimes(Collection $rows): array
    {
        $byDay = array_fill(0, 7, 0);
        $byHour = array_fill(0, 24, 0);

        foreach ($rows as $r) {
            $at = CarbonImmutable::parse($r->created_at, $this->appTz)->setTimezone(self::TZ);
            $byDay[((int) $at->format('N')) - 1]++;
            $byHour[(int) $at->format('G')]++;
        }

        $weekdays = [];
        foreach (self::DAY_NAMES as $i => $name) {
            $weekdays[] = ['day' => $name, 'orders' => $byDay[$i]];
        }

        if (max($byDay) === 0) {
            return [$weekdays, ['day' => null, 'hour' => null]];
        }

        $h = (int) array_search(max($byHour), $byHour, true);

        return [$weekdays, [
            'day' => self::DAY_NAMES[(int) array_search(max($byDay), $byDay, true)],
            'hour' => (($h % 12) ?: 12).($h < 12 ? ' AM' : ' PM'),
        ]];
    }

    // Customer star ratings for orders placed in the period. Safe to call before the ratings table exists.
    /**
     * @return array<string, mixed>
     */
    private function ratings(CarbonImmutable $from, CarbonImmutable $to, int $completed): array
    {
        $empty = [
            'ready' => false, 'count' => 0, 'average' => null, 'responseRate' => null,
            'distribution' => array_map(fn ($s) => ['stars' => $s, 'count' => 0], [5, 4, 3, 2, 1]),
            'needsAttention' => [], 'praise' => [],
        ];

        if (! Schema::hasTable('order_ratings')) {
            return $empty;
        }

        $base = fn () => DB::table('order_ratings as r')
            ->join('orders as o', 'o.id', '=', 'r.order_id')
            ->where('o.created_at', '>=', $from->setTimezone($this->appTz)->format(self::FMT))
            ->where('o.created_at', '<=', $to->setTimezone($this->appTz)->format(self::FMT));

        $counts = $base()->selectRaw('r.stars as stars, count(*) as c')->groupBy('r.stars')->pluck('c', 'stars');
        $count = (int) $counts->sum();
        $empty['ready'] = true;

        if ($count === 0) {
            return $empty;
        }

        $sum = 0;
        $dist = [];
        foreach ([5, 4, 3, 2, 1] as $s) {
            $n = (int) ($counts[$s] ?? 0);
            $sum += $s * $n;
            $dist[] = ['stars' => $s, 'count' => $n];
        }

        $comments = $base()
            ->leftJoin('users as u', 'u.id', '=', 'r.user_id')
            ->whereNotNull('r.comment')
            ->where('r.comment', '!=', '')
            ->orderByDesc('r.created_at')
            ->limit(60)
            ->get(['r.order_id', 'r.stars', 'r.comment', 'r.created_at', 'u.name']);

        $shape = fn ($c) => [
            'order' => (int) $c->order_id,
            'stars' => (int) $c->stars,
            'comment' => (string) $c->comment,
            'name' => $c->name ? explode(' ', trim((string) $c->name))[0] : 'Customer',
            'at' => CarbonImmutable::parse($c->created_at, $this->appTz)->toIso8601String(),
        ];

        return [
            'ready' => true,
            'count' => $count,
            'average' => round($sum / $count, 1),
            'responseRate' => $completed > 0 ? min(100, (int) round($count / $completed * 100)) : null,
            'distribution' => $dist,
            'needsAttention' => $comments->filter(fn ($c) => (int) $c->stars <= 3)->take(4)->map($shape)->values()->all(),
            'praise' => $comments->filter(fn ($c) => (int) $c->stars >= 4)->take(4)->map($shape)->values()->all(),
        ];
    }

    // Percent change versus the previous period, or null when there is nothing to compare with.
    private function delta(float|int $now, float|int $before): ?float
    {
        return $before > 0 ? round(($now - $before) / $before * 100, 1) : null;
    }

    private function peso(float|int $n): string
    {
        return '₱'.number_format((float) $n, 0);
    }

    // One plain sentence that says how the shop did.
    /**
     * @param  array<string, mixed>  $s
     */
    private function headline(array $s, CarbonImmutable $start, CarbonImmutable $end): string
    {
        $range = $start->format('M j').' to '.$end->format('M j, Y');

        if ($s['orders'] === 0) {
            return "No orders were placed from {$range}.";
        }

        $text = "From {$range} you received {$s['orders']} ".($s['orders'] === 1 ? 'order' : 'orders')
            .". {$s['completed']} ".($s['completed'] === 1 ? 'is' : 'are')
            .' finished and earned '.$this->peso($s['sales']).'.';

        if ($s['salesDelta'] !== null) {
            $d = abs($s['salesDelta']);
            $text .= $s['salesDelta'] > 0
                ? " That is {$d}% more than the period before."
                : ($s['salesDelta'] < 0 ? " That is {$d}% less than the period before." : ' That is the same as the period before.');
        }

        return $text;
    }

    // Plain-language advice: what is going well and what needs attention.
    // Each point has a level: good | watch | action ("action" = do this first).
    /**
     * @param  array<string, mixed>  $f
     * @return array{good: array<int, array<string, string>>, improve: array<int, array<string, string>>}
     */
    private function advice(array $f): array
    {
        $cfg = fn (string $key, float $default) => (float) config("laundry.report.{$key}", $default);
        $good = [];
        $improve = [];
        $add = function (array &$list, string $level, string $title, string $detail) {
            $list[] = ['level' => $level, 'title' => $title, 'detail' => $detail];
        };

        $s = $f['summary'];
        if ($s['orders'] === 0) {
            $add($improve, 'watch', 'No orders in this period', 'Try a longer period, or promote the shop to bring in customers.');

            return ['good' => $good, 'improve' => $improve];
        }

        // --- sales trend
        $change = $cfg('change_pct', 10);
        if ($s['salesDelta'] !== null && $s['salesDelta'] >= $change) {
            $add($good, 'good', "Sales are up {$s['salesDelta']}%", 'You earned more than in the period before. Keep doing what is working.');
        } elseif ($s['salesDelta'] !== null && $s['salesDelta'] <= -$change) {
            $add($improve, 'watch', 'Sales are down '.abs($s['salesDelta']).'%', 'Check the busy-times and customer sections below. A reminder to past customers or a small promo can help.');
        }

        // --- open orders that need a push (do these first)
        if ($f['stuck']['count'] > 0) {
            $n = $f['stuck']['count'];
            $add($improve, 'action', "{$n} ".($n === 1 ? 'order has' : 'orders have')." not moved in {$f['stuck']['hours']}+ hours", 'Open them from the dashboard and update their status first, so customers are not left waiting.');
        } else {
            $add($good, 'good', 'No orders are stuck', 'Every open order has moved within the last '.$f['stuck']['hours'].' hours.');
        }

        $wait = $f['speed']['oldestPendingHours'];
        if ($wait !== null && $wait > $cfg('pending_wait_hours', 12)) {
            $add($improve, 'action', 'A new order has been waiting '.round($wait).' hours to start', 'Start it, or message the customer, so they know it is being handled.');
        }

        // --- speed
        $avg = $f['speed']['avgHours'];
        if ($avg !== null && $f['speed']['sample'] >= 3) {
            if ($avg <= $cfg('turnaround_good_hours', 24)) {
                $add($good, 'good', "Laundry is ready fast (about {$avg} hours)", 'Quick turnaround is one of the biggest reasons customers come back.');
            } elseif ($avg > $cfg('turnaround_slow_hours', 48)) {
                $add($improve, 'watch', "Laundry takes about {$avg} hours to be ready", 'That is slow for most customers. Look at which days pile up and plan helpers for them.');
            }
        }

        // --- customer happiness
        $r = $f['ratings'];
        if ($r['count'] > 0 && $r['average'] !== null) {
            if ($r['average'] >= $cfg('rating_good', 4.0)) {
                $add($good, 'good', "Customers are happy ({$r['average']} out of 5)", 'Most ratings are positive. Share your best comments with the team.');
            } elseif ($r['average'] < $cfg('rating_low', 3.5)) {
                $add($improve, 'action', "Customer rating is low ({$r['average']} out of 5)", 'Read the comments in the Customer feedback section and fix the most repeated complaint first.');
            }
        }
        if ($f['cur']['completed'] >= 5 && $r['responseRate'] !== null && $r['responseRate'] < $cfg('rating_response_pct', 30)) {
            $add($improve, 'watch', "Only {$r['responseRate']}% of finished orders were rated", 'Ask customers to tap the stars in My Orders when they collect their laundry. More ratings make the feedback more trustworthy.');
        }

        // --- money
        $unpaid = $f['unpaid'];
        $billed = $f['cur']['sum'];
        if ($unpaid['count'] > 0 && $billed > 0 && $unpaid['amount'] / $billed * 100 >= $cfg('unpaid_share_pct', 20)) {
            $add($improve, 'watch', $this->peso($unpaid['amount']).' is still unpaid', "{$unpaid['count']} ".($unpaid['count'] === 1 ? 'order has' : 'orders have').' not been paid. Remind GCash customers to pay, and collect cash when orders are claimed.');
        } elseif ($unpaid['count'] === 0) {
            $add($good, 'good', 'Everything is paid', 'No unpaid orders in this period.');
        }

        // --- customers
        $c = $f['customers'];
        if ($c['total'] >= 5 && $c['repeatRate'] !== null) {
            if ($c['repeatRate'] >= $cfg('repeat_good_pct', 50)) {
                $add($good, 'good', "{$c['repeatRate']}% of customers came back", 'Returning customers are the cheapest sales you can get. Your service is earning loyalty.');
            } else {
                $add($improve, 'watch', "Only {$c['repeatRate']}% of customers are returning", 'Offer a small thank-you (like a free fold or a discount on the next order) to turn new customers into regulars.');
            }
        }

        // --- what sells
        $svc = $f['services'];
        if (count($svc) > 1 && $svc[0]['share'] >= 60) {
            $add($improve, 'watch', "{$svc[0]['share']}% of orders are \"{$svc[0]['name']}\"", 'Your income depends on one service. Try promoting the others so a slow week for one does not hurt everything.');
        }

        return ['good' => $good, 'improve' => $improve];
    }
}
