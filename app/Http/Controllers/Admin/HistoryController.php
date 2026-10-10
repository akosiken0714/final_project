<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

// The shop's history book: every order, status change, payment and admin action, newest first.
class HistoryController extends Controller
{
    private const TZ = 'Asia/Manila';

    private const TYPES = ['all' => 'Everything', 'orders' => 'Orders', 'payments' => 'Payments', 'admin' => 'Admin actions'];

    public function index(Request $request)
    {
        [$type, $q] = $this->filters($request);

        $logs = $this->query($type, $q)->with('user:id,name')->paginate(25)->withQueryString()
            ->through(fn (ActivityLog $l) => [
                'id' => $l->id,
                'event' => $l->event,
                'summary' => $l->summary,
                'who' => $l->user?->name ?? 'System',
                'order_id' => $l->order_id,
                'at' => $l->created_at?->toIso8601String(),
            ]);

        $now = CarbonImmutable::now(self::TZ);
        $appTz = (string) config('app.timezone');
        $received = fn (CarbonImmutable $from) => (float) DB::table('payments')
            ->where('status', 'success')
            ->where('created_at', '>=', $from->setTimezone($appTz)->format('Y-m-d H:i:s'))
            ->sum('amount');

        return Inertia::render('Admin/History', [
            'logs' => $logs,
            'type' => $type,
            'q' => $q,
            'types' => self::TYPES,
            'received' => [
                'today' => $received($now->startOfDay()),
                'week' => $received($now->startOfWeek()),
                'month' => $received($now->startOfMonth()),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$type, $q] = $this->filters($request);
        $query = $this->query($type, $q)->with('user:id,name');

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Date (Manila)', 'Event', 'Who', 'Order #', 'What happened'], ',', '"', '');

            foreach ($query->cursor() as $l) {
                fputcsv($out, [
                    $l->created_at?->setTimezone(self::TZ)->format('Y-m-d H:i'),
                    $l->event,
                    $this->csvSafe($l->user?->name ?? 'System'),
                    $l->order_id,
                    $this->csvSafe($l->summary),
                ], ',', '"', '');
            }
            fclose($out);
        }, 'shop-history.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function filters(Request $request): array
    {
        $type = array_key_exists((string) $request->query('type'), self::TYPES) ? (string) $request->query('type') : 'all';

        return [$type, trim((string) $request->query('q', ''))];
    }

    private function query(string $type, string $q)
    {
        return ActivityLog::query()
            ->when($type === 'orders', fn ($x) => $x->where('event', 'like', 'order.%'))
            ->when($type === 'payments', fn ($x) => $x->where('event', 'like', 'payment.%'))
            ->when($type === 'admin', fn ($x) => $x->where(fn ($w) => $w->where('event', 'like', 'user.%')->orWhere('event', 'like', 'service.%')))
            ->when($q !== '', fn ($x) => $x->where('summary', 'like', '%'.str_replace(['%', '_'], '', $q).'%'))
            ->latest('created_at')->orderByDesc('id');
    }

    // A cell that starts with = + - @ can run as a formula in Excel.
    private function csvSafe(?string $value): string
    {
        $value = (string) $value;

        return $value !== '' && str_contains("=+-@\t\r", $value[0]) ? "'".$value : $value;
    }
}
