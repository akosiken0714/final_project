<?php

namespace App\Support;

// Decides whether an address is inside the delivery area and what the delivery fee is.
// The customer's page does the same math to show the fee live, but THIS is the one that counts.
class DeliveryZone
{
    public const REFUSAL = "Sorry, we can't deliver to this location.";

    /**
     * @return array{name: string, address: string, lat: float, lng: float}
     */
    public static function shop(): array
    {
        return [
            'name' => (string) config('laundry.shop.name'),
            'address' => (string) config('laundry.shop.address'),
            'lat' => (float) config('laundry.shop.lat'),
            'lng' => (float) config('laundry.shop.lng'),
        ];
    }

    // What the order page needs to repeat the check on screen.
    /**
     * @return array<string, mixed>
     */
    public static function forPage(): array
    {
        return [
            'shop' => self::shop(),
            'max_km' => (float) config('laundry.delivery.max_km'),
            'tiers' => array_values(config('laundry.delivery.tiers')),
        ];
    }

    // Straight-line distance in kilometres (haversine).
    public static function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371.0088;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * @return array{deliverable: bool, distance_km: float|null, fee: float|null, message: string|null}
     */
    public static function quote(float $lat, float $lng): array
    {
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return ['deliverable' => false, 'distance_km' => null, 'fee' => null, 'message' => self::REFUSAL];
        }

        $shop = self::shop();
        $km = self::distanceKm($shop['lat'], $shop['lng'], $lat, $lng);

        if ($km > (float) config('laundry.delivery.max_km')) {
            return ['deliverable' => false, 'distance_km' => round($km, 2), 'fee' => null, 'message' => self::REFUSAL];
        }

        /** @var array<int, array{km: float|int, fee: float|int}> $tierConfig */
        $tierConfig = config('laundry.delivery.tiers');
        $tiers = collect($tierConfig)->sortBy('km')->values();
        $tier = $tiers->first(fn ($t) => $km <= $t['km']) ?? $tiers->last();

        return ['deliverable' => true, 'distance_km' => round($km, 2), 'fee' => (float) ($tier['fee'] ?? 0), 'message' => null];
    }
}
