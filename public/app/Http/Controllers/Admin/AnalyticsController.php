<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    // Shop time. Orders stay stored in the app timezone (UTC); we only convert for reporting.
    private const TZ = 'Asia/Manila';

    private const RANGES = [7, 30, 90, 365];

    // An open order that has not changed status for this long is flagged as "stuck".
    private const STUCK_HOURS = 48;

    private const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // All the numbers for the dashboard's analytics section.
    /**
     * @return array<string, mixed>
     */
    public function data(Request $request): array
    {
        $days = $this->days($request);
        $appTz = (string) config('app.timezone');
        $fmt = 'Y-m-d H:i:s';

        // Whole days in shop time, today included.
        $now = CarbonImmutable::now(self::TZ);
        $start = $now->startOfDay()->subDays($days - 1);
        $prevStart = $start->subDays($days);

        $rows = DB::table('orders')
            ->where('created_at', '>=', $prevStart->setTimezone($appTz)->format($fmt))
            ->where('created_at', '<=', $now->setTimezone($appTz)->format($fmt))
            ->get(['id', 'user_id', 'service_id', 'total', 'status', 'photo', 'created_at']);

        $daily = [];
        for ($i = 0; $i < $days; $i++) {
            $key = $start->addDays($i)->format('Y-m-d');
            $daily[$key] = ['date' => $key, 'orders' => 0, 'revenue' => 0.0];
        }

        $heat = array_fill(0, 7, array_fill(0, 24, 0));
        $cur = ['orders' => 0, 'revenue' => 0.0, 'sum' => 0.0, 'photos' => 0];
        $prev = ['orders' => 0, 'revenue' => 0.0];
        $mix = [];
        $spend = [];
        $count = [];

        foreach ($rows as $r) {
            $at = CarbonImmutable::parse($r->created_at, $appTz)->setTimezone(self::TZ);
            $total = (float) $r->total;
            $done = $r->status === 'Completed';

            if ($at < $start) {
                $prev['orders']++;
                if ($done) {
                    $prev['revenue'] += $total;
                }

                continue;
            }

            $cur['orders']++;
            $cur['sum'] += $total;
            if ($done) {
                $cur['revenue'] += $total;
            }
            if ($r->photo) {
                $cur['photos']++;
            }

            $key = $at->format('Y-m-d');
            if (isset($daily[$key])) {
                $daily[$key]['orders']++;
                if ($done) {
                    $daily[$key]['revenue'] += $total;
                }
            }

            $heat[((int) $at->format('N')) - 1][(int) $at->format('G')]++;

            $mix[$r->service_id] ??= ['orders' => 0, 'revenue' => 0.0];
            $mix[$r->service_id]['orders']++;
            if ($done) {
                $mix[$r->service_id]['revenue'] += $total;
            }

            $count[$r->user_id] = ($count[$r->user_id] ?? 0) + 1;
            $spend[$r->user_id] = ($spend[$r->user_id] ?? 0.0) + ($done ? $total : 0.0);
        }

        foreach ($daily as $k => $d) {
            $daily[$k]['revenue'] = round($d['revenue'], 2);
        }

        return [
            'range' => $days,
            'ranges' => self::RANGES,
            'summary' => [
                'orders' => $cur['orders'],
                'ordersDelta' => $this->delta($cur['orders'], $prev['orders']),
                'revenue' => round($cur['revenue'], 2),
                'revenueDelta' => $this->delta($cur['revenue'], $prev['revenue']),
                'average' => $cur['orders'] ? round($cur['sum'] / $cur['orders'], 2) : 0,
            ],
            'daily' => array_values($daily),
            'heat' => $heat,
            'peak' => $this->peak($heat),
            'services' => $this->serviceMix($mix),
            'pipeline' => $this->pipeline(),
            'oldestPendingHours' => $this->oldestPendingHours($appTz),
            'turnaround' => $this->turnaround($start->setTimezone($appTz)->format($fmt), $appTz),
            'customers' => $this->customers($count, $spend, $start, $appTz),
            'stuck' => $this->stuck(),
            'photoRate' => $cur['orders'] ? round($cur['photos'] / $cur['orders'] * 100) : null,
        ];
    }

    // Analytics now lives on the dashboard, so the old address just goes there.
    public function index(Request $request): RedirectResponse
    {
        return redirect('/admin'.($request->query('range') ? '?range='.$this->days($request) : ''));
    }

    public function export(Request $request): StreamedResponse
    {
        $days = $this->days($request);
        $appTz = (string) config('app.timezone');
        $from = CarbonImmutable::now(self::TZ)->startOfDay()->subDays($days - 1)
            ->setTimezone($appTz)->format('Y-m-d H:i:s');

        $query = DB::table('orders as o')
            ->leftJoin('users as u', 'u.id', '=', 'o.user_id')
            ->leftJoin('services as s', 's.id', '=', 'o.service_id')
            ->where('o.created_at', '>=', $from)
            ->orderBy('o.id')
            ->select('o.id', 'o.created_at', 'u.name as customer', 'u.phone', 's.name as service', 'o.quantity', 'o.total', 'o.status');

        return response()->streamDownload(function () use ($query, $appTz) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF"); // so Excel reads names with accents correctly
            fputcsv($out, ['Order #', 'Date (Manila)', 'Customer', 'Phone', 'Service', 'Quantity', 'Total', 'Status'], ',', '"', '');

            foreach ($query->cursor() as $r) {
                fputcsv($out, [
                    $r->id,
                    CarbonImmutable::parse($r->created_at, $appTz)->setTimezone(self::TZ)->format('Y-m-d H:i'),
                    $this->csvSafe($r->customer ?? 'Deleted customer'),
                    $this->csvSafe($r->phone),
                    $this->csvSafe($r->service),
                    $r->quantity,
                    $r->total,
                    $r->status,
                ], ',', '"', '');
            }
            fclose($out);
        }, "orders-last-{$days}-days.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function days(Request $request): int
    {
        $days = (int) $request->query('range', 30);

        return in_array($days, self::RANGES, true) ? $days : 30;
    }

    // Percent change versus the previous period, or null when there is nothing to compare with.
    private function delta(float|int $now, float|int $before): ?float
    {
        return $before > 0 ? round(($now - $before) / $before * 100, 1) : null;
    }

    /**
     * @param  array<int, array<int, int>>  $heat
     * @return array{day: string|null, hour: string|null}
     */
    private function peak(array $heat): array
    {
        $dayTotals = array_map('array_sum', $heat);
        $hourTotals = array_fill(0, 24, 0);
        foreach ($heat as $row) {
            foreach ($row as $h => $n) {
                $hourTotals[$h] += $n;
            }
        }

        $topDay = max($dayTotals ?: [0]);

        if ($topDay === 0) {
            return ['day' => null, 'hour' => null];
        }

        $h = (int) array_search(max($hourTotals), $hourTotals, true);

        return [
            'day' => self::DAY_NAMES[(int) array_search($topDay, $dayTotals, true)],
            'hour' => (($h % 12) ?: 12).($h < 12 ? ' AM' : ' PM'),
        ];
    }

    /**
     * @param  array<int|string, array<string, mixed>>  $mix
     * @return array<int, array<string, mixed>>
     */
    private function serviceMix(array $mix): array
    {
        $names = Service::pluck('name', 'id');

        $list = [];
        foreach ($mix as $id => $m) {
            $list[] = [
                'name' => $names[$id] ?? 'Removed service',
                'orders' => $m['orders'],
                'revenue' => round($m['revenue'], 2),
            ];
        }
        usort($list, fn ($a, $b) => $b['orders'] <=> $a['orders']);

        return $list;
    }

    // Where every order is right now (all time, not just the chosen range).
    /**
     * @return array<int, array<string, mixed>>
     */
    private function pipeline(): array
    {
        $counts = DB::table('orders')
            ->select('status', DB::raw('count(*) as c'))
            ->groupBy('status')
            ->pluck('c', 'status')
            ->all();

        $out = [];
        foreach (Order::STATUSES as $s) {
            $out[] = ['status' => $s, 'count' => (int) ($counts[$s] ?? 0)];
            unset($counts[$s]);
        }
        // any status that is in the data but not in the list (so nothing is hidden)
        foreach ($counts as $s => $c) {
            $out[] = ['status' => $s, 'count' => (int) $c];
        }

        return $out;
    }

    private function oldestPendingHours(string $appTz): ?float
    {
        $oldest = DB::table('orders')->where('status', 'Pending')->min('created_at');
        if (! $oldest) {
            return null;
        }

        $seconds = CarbonImmutable::now($appTz)->getTimestamp() - CarbonImmutable::parse($oldest, $appTz)->getTimestamp();

        return round(max(0, $seconds) / 3600, 1);
    }

    // Average time from order to first "ready", using the saved status history.
    /**
     * @return array<string, mixed>
     */
    private function turnaround(string $from, string $appTz): array
    {
        $rows = DB::table('order_status_logs as l')
            ->join('orders as o', 'o.id', '=', 'l.order_id')
            ->whereIn('l.to_status', ['Ready for Pickup', 'Ready'])
            ->where('o.created_at', '>=', $from)
            ->groupBy('o.id', 'o.created_at')
            ->selectRaw('o.created_at as ordered_at, MIN(l.created_at) as ready_at')
            ->get();

        $hours = [];
        foreach ($rows as $r) {
            $s = CarbonImmutable::parse($r->ready_at, $appTz)->getTimestamp() - CarbonImmutable::parse($r->ordered_at, $appTz)->getTimestamp();
            if ($s >= 0) {
                $hours[] = $s / 3600;
            }
        }

        return [
            'avgHours' => $hours ? round(array_sum($hours) / count($hours), 1) : null,
            'sample' => count($hours),
        ];
    }

    /**
     * @param  array<int|string, int>  $count
     * @param  array<int|string, float|int>  $spend
     * @return array<string, mixed>
     */
    private function customers(array $count, array $spend, CarbonImmutable $start, string $appTz): array
    {
        $firstSeen = DB::table('orders')
            ->selectRaw('user_id, MIN(created_at) as first_at')
            ->groupBy('user_id')
            ->pluck('first_at', 'user_id');

        $new = 0;
        $returning = 0;
        foreach (array_keys($count) as $uid) {
            $first = isset($firstSeen[$uid]) ? CarbonImmutable::parse($firstSeen[$uid], $appTz)->setTimezone(self::TZ) : null;
            if ($first && $first >= $start) {
                $new++;
            } else {
                $returning++;
            }
        }

        arsort($spend);
        $topIds = array_keys(array_filter(array_slice($spend, 0, 5, true), fn ($v) => $v > 0));
        $names = $topIds ? User::withTrashed()->whereIn('id', $topIds)->pluck('name', 'id') : collect();

        $top = [];
        foreach ($topIds as $uid) {
            $top[] = [
                'name' => $names[$uid] ?? 'Deleted customer',
                'orders' => $count[$uid],
                'spent' => round($spend[$uid], 2),
            ];
        }

        return ['new' => $new, 'returning' => $returning, 'top' => $top];
    }

    /**
     * @return array<string, mixed>
     */
    private function stuck(): array
    {
        $before = now()->subHours(self::STUCK_HOURS)->format('Y-m-d H:i:s');
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
                    'hours' => round(max(0, now()->getTimestamp() - CarbonImmutable::parse($o->updated_at, (string) config('app.timezone'))->getTimestamp()) / 3600),
                ])->all(),
        ];
    }

    // A cell that starts with = + - @ can run as a formula when the CSV is opened in Excel.
    private function csvSafe(?string $value): string
    {
        $value = (string) $value;

        return $value !== '' && str_contains("=+-@\t\r", $value[0]) ? "'".$value : $value;
    }
}
