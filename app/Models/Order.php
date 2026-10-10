<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Order extends Model
{
    const STATUSES = ['Pending', 'In Progress', 'Ready for Pickup', 'Out for Delivery', 'Completed'];

    protected $fillable = [
        'user_id', 'service_id', 'quantity', 'total', 'instructions', 'address', 'photo', 'status',
        'fulfillment', 'lat', 'lng', 'distance_km', 'delivery_fee',
        'payment_method', 'payment_status', 'payment_reference', 'paid_at',
    ];

    protected $appends = ['photo_url', 'amount_due'];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'distance_km' => 'float',
        'delivery_fee' => 'float',
        'paid_at' => 'datetime',
    ];

    // Where an order is in its life:
    //   ONGOING -> still being handled   READY -> washed, waiting to be claimed   CLAIMED -> picked up / delivered (the log)
    const ONGOING = ['Pending', 'In Progress'];

    const READY = 'Ready for Pickup';

    const CLAIMED = 'Completed';

    // How the laundry gets to and from the customer.
    const DELIVERY = 'delivery';   // we collect it and bring it back (delivery fee applies)

    const DROPOFF = 'dropoff';     // the customer brings it to the shop and collects it there

    const FULFILLMENTS = [self::DELIVERY, self::DROPOFF];

    // How the customer pays.
    const CASH = 'cash';

    const GCASH = 'gcash';

    const PAYMENT_METHODS = [self::CASH, self::GCASH];

    const UNPAID = 'unpaid';

    const PAID = 'paid';

    /**
     * @param  Builder<Order>  $query
     * @return Builder<Order>
     */
    public function scopeOngoing($query)
    {
        return $query->where(function ($q) {
            $q->whereIn('status', self::ONGOING)
                ->orWhere(function ($delivery) {
                    $delivery->where('fulfillment', self::DELIVERY)
                        ->where('status', 'Out for Delivery');
                });
        });
    }

    protected static function booted(): void
    {
        static::deleting(fn (Order $order) => $order->deletePhotoFiles());
    }

    // Removes the photo from every disk it could be on.
    public function deletePhotoFiles(): void
    {
        if (! $this->photo) {
            return;
        }

        foreach (['local', 'public'] as $disk) {
            Storage::disk($disk)->delete($this->photo);
        }
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class)->withTrashed();
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo ? url("/orders/{$this->id}/photo") : null;
    }

    // Laundry price + delivery fee: what the customer actually pays.
    // (`total` stays the laundry price only, so shop revenue and the analytics are not mixed up with delivery money.)
    public function getAmountDueAttribute(): float
    {
        return round((float) $this->total + (float) $this->delivery_fee, 2);
    }

    public function isPaid(): bool
    {
        return $this->payment_status === self::PAID;
    }

    // Cash is collected by hand: the admin marks it, or it is marked automatically when the order is claimed.
    public function markCashPaid(?int $userId = null): void
    {
        if ($this->isPaid() || $this->payment_method !== self::CASH) {
            return;
        }

        $reference = 'CASH-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);

        $this->update(['payment_status' => self::PAID, 'paid_at' => now(), 'payment_reference' => $reference]);

        $this->payments()->create([
            'user_id' => $this->user_id,
            'method' => self::CASH,
            'driver' => 'manual',
            'amount' => $this->amount_due,
            'status' => 'success',
            'reference' => $reference,
        ]);
    }
}
