<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// A named, reusable order ("Weekly wash", "Mom's bedding"). It never stores a photo.
class SavedOrder extends Model
{
    const MAX_PER_USER = 20;

    protected $fillable = ['user_id', 'name', 'service_id', 'quantity', 'address', 'fulfillment', 'lat', 'lng', 'instructions', 'last_used_at'];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'last_used_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class)->withTrashed();
    }

    // Names are matched ignoring upper/lower case, per customer.
    public static function named(User $user, string $name): ?self
    {
        return static::where('user_id', $user->id)
            ->whereRaw('lower(name) = ?', [mb_strtolower(trim($name))])
            ->first();
    }

    public static function countFor(User $user): int
    {
        return static::where('user_id', $user->id)->count();
    }

    // Saves under this name. If the customer already has one with that name, it is updated instead of duplicated.
    // Saving counts as "used", so it moves to the front of the list.
    public static function remember(User $user, string $name, array $fields): self
    {
        $name = trim($name);
        $values = [
            'name' => $name,
            'service_id' => $fields['service_id'],
            'quantity' => $fields['quantity'],
            'address' => $fields['address'] ?? '',
            'fulfillment' => $fields['fulfillment'] ?? Order::DELIVERY,
            'lat' => $fields['lat'] ?? null,
            'lng' => $fields['lng'] ?? null,
            'instructions' => $fields['instructions'] ?? null,
            'last_used_at' => now(),
        ];

        $saved = static::named($user, $name);

        if ($saved) {
            $saved->update($values);

            return $saved;
        }

        return static::create($values + ['user_id' => $user->id]);
    }

    // Reusing a saved order (placing an order from it) moves it to the front of the list.
    public static function markUsed(User $user, int $id): void
    {
        static::where('user_id', $user->id)->where('id', $id)->update(['last_used_at' => now()]);
    }

    // What the pages need to show and reuse a saved order. Most recently used first.
    public static function cardsFor(User $user): array
    {
        return static::where('user_id', $user->id)
            ->with('service')
            ->orderByRaw('last_used_at IS NULL')
            ->orderByDesc('last_used_at')
            ->orderBy('name')
            ->get()
            ->map(fn (self $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'service_id' => $s->service_id,
                'quantity' => (int) $s->quantity,
                'address' => $s->address,
                'fulfillment' => $s->fulfillment ?: Order::DELIVERY,
                'lat' => $s->lat,
                'lng' => $s->lng,
                'instructions' => $s->instructions,
                'service_name' => $s->service?->name,
                'unit' => $s->service?->unit,
                'price' => $s->service?->price,
                // false when the shop removed or hid that service since it was saved
                'available' => (bool) ($s->service && ! $s->service->trashed() && $s->service->active),
            ])
            ->values()
            ->all();
    }
}
