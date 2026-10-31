<?php

namespace App\Support;

use App\Models\Order;
use App\Models\OrderIntake;
use App\Models\User;

// Saves the "what we received at the counter" record. Used by the walk-in form and by the
// "Receive laundry" box in the order table, so both follow exactly the same rules.
class Intake
{
    /**
     * Creates the record, or updates it if the order already has one.
     * A new photo replaces the old one (the old file is deleted); $removePhoto drops it without a replacement.
     *
     * @return array{intake: OrderIntake, created: bool, oldCount: int|null}
     */
    public static function save(Order $order, User $by, int $items, ?string $notes, ?string $newPhoto = null, bool $removePhoto = false): array
    {
        $existing = $order->intake()->first();
        $oldCount = $existing?->item_count;
        $oldPhoto = $existing?->photo;

        $photo = $oldPhoto;
        if ($newPhoto !== null) {
            $photo = $newPhoto;
        } elseif ($removePhoto) {
            $photo = null;
        }

        $intake = $existing ?? new OrderIntake(['order_id' => $order->id, 'received_by' => $by->id, 'received_at' => now()]);
        $intake->fill([
            'item_count' => $items,
            'notes' => $notes !== null && trim($notes) !== '' ? trim($notes) : null,
            'photo' => $photo,
        ])->save();

        if ($oldPhoto && $oldPhoto !== $photo) {
            OrderIntake::deleteFile($oldPhoto);
        }

        return ['intake' => $intake, 'created' => $existing === null, 'oldCount' => $oldCount];
    }

    public static function itemsLabel(int $n): string
    {
        return $n === 1 ? '1 item' : "{$n} items";
    }
}
