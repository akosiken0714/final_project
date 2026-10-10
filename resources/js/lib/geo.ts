// Small map helpers shared by the order page and the profile page.

export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// Turns a pin into a readable address (OpenStreetMap). Returns null if it can't, so callers just skip it.
export async function reverseGeocode(
    lat: number,
    lng: number,
): Promise<string | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=en&lat=${lat}&lon=${lng}`;
        const res = await fetch(url);
        if (!res.ok) return null;

        const data = await res.json();
        const a = data?.address ?? {};

        const street = [a.house_number, a.road].filter(Boolean).join(' ');
        const area =
            a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet;
        const town = a.city || a.town || a.municipality || a.county;
        const text = [street, area, town].filter(Boolean).join(', ');

        if (text.length >= 10) return text;

        // Fall back to the first few parts of the long name.
        const long = String(data?.display_name ?? '')
            .split(',')
            .slice(0, 3)
            .join(',')
            .trim();
        return long.length >= 10 ? long : null;
    } catch {
        return null;
    }
}

// Opens turn-by-turn directions in the customer's maps app.
export const directionsLink = (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
