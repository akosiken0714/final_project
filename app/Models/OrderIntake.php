<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

// The record made when laundry is received at the counter: how many items, their condition and an optional photo.
// It is what settles a "my shirt is missing / damaged" dispute. One row per order.
// The item count and notes are shown to the customer too, so write notes the customer may read.
class OrderIntake extends Model
{
    protected $fillable = ['order_id', 'item_count', 'notes', 'photo', 'received_by', 'received_at'];

    // The page gets photo_url and the receiver's name, never the storage path or the whole staff account.
    protected $appends = ['photo_url', 'received_by_name'];

    protected $hidden = ['photo', 'receiver'];

    protected $casts = [
        'item_count' => 'integer',
        'received_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by')->withTrashed();
    }

    // Private: only the order's owner or the shop team can open it (see OrderIntakeController::photo).
    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ? url("/orders/{$this->order_id}/intake-photo") : null;
    }

    public function getReceivedByNameAttribute(): ?string
    {
        return $this->receiver?->name;
    }

    // The disk that really holds the photo, or null when there is none / the file is gone.
    public function photoDisk(): ?string
    {
        if (! $this->photo) {
            return null;
        }

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($this->photo)) {
                return $disk;
            }
        }

        return null;
    }

    public static function deleteFile(?string $path): void
    {
        if (! $path) {
            return;
        }

        foreach (['local', 'public'] as $disk) {
            Storage::disk($disk)->delete($path);
        }
    }

    // What the pages need, in one small array (also used for the customer, so no internal fields).
    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        return [
            'item_count' => $this->item_count,
            'notes' => $this->notes,
            'photo_url' => $this->photo_url,
            'received_at' => $this->received_at?->toIso8601String(),
            'received_by' => $this->received_by_name,
        ];
    }
}
