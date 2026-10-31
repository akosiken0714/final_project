<?php

namespace App\Support;

use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderNotice;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

// One place to write history and send bell notifications.
// Everything is wrapped so a logging problem can NEVER stop an order or a payment.
class Activity
{
    public static function tag(int $orderId): string
    {
        return '#'.str_pad((string) $orderId, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function log(string $event, string $summary, ?Order $order = null, ?int $actorId = null, array $meta = []): void
    {
        try {
            ActivityLog::create([
                'user_id' => $actorId ?? auth()->id(),
                'order_id' => $order?->id,
                'event' => $event,
                'summary' => Str::limit($summary, 250, '…'),
                'meta' => $meta ?: null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // The shop team: admins and staff (cashiers) both want to hear about new and cancelled orders.
    public static function notifyAdmins(string $title, string $body, string $url, ?int $orderId = null): void
    {
        try {
            Notification::send(User::whereIn('role', [User::ADMIN, User::STAFF])->get(), new OrderNotice($title, $body, $url, $orderId));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public static function notifyUser(?User $user, string $title, string $body, string $url, ?int $orderId = null): void
    {
        // A walk-in customer without an email can never log in, so nobody would ever read the bell message.
        if (! $user || $user->email === null) {
            return;
        }

        try {
            $user->notify(new OrderNotice($title, $body, $url, $orderId));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public static function money(float|int|string $n): string
    {
        return '₱'.number_format((float) $n, 2);
    }
}
