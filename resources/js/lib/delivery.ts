// The same delivery-area math the server uses, so the order page can show the fee while the customer picks a spot.
// The server repeats the check when the order is sent, so this is only for showing things on screen.

export type Zone = {
    shop: { name: string; address?: string; lat: number; lng: number };
    max_km: number;
    tiers: { km: number; fee: number }[];
};

export type Quote = { deliverable: boolean; km: number; fee: number | null };

export const REFUSAL = "Sorry, we can't deliver to this location.";

export function distanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function quote(zone: Zone, lat: number, lng: number): Quote {
    const km = distanceKm(zone.shop.lat, zone.shop.lng, lat, lng);
    if (km > zone.max_km) return { deliverable: false, km, fee: null };

    const tiers = [...zone.tiers].sort((a, b) => a.km - b.km);
    const tier = tiers.find((t) => km <= t.km) ?? tiers[tiers.length - 1];
    return { deliverable: true, km, fee: Number(tier.fee) };
}

export const mapLink = (lat: number, lng: number) =>
    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

export const peso = (n: number | string) => '₱' + Number(n).toFixed(2);
