import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { useEffect, useRef, useState } from 'react';

export type Pin = { lat: number; lng: number } | null;

const round = (n: number) => Math.round(n * 1e6) / 1e6;

type Hit = { place_id: number; display_name: string; lat: string; lon: string };

// A small OpenStreetMap. The customer taps the map (or drags the pin) to say where we should pick up and deliver.
// The shop is marked "S" and the delivery area is the peach circle.
export default function LocationPicker({
    value,
    shop,
    maxKm,
    onChange,
    onAddress,
}: {
    value: Pin;
    shop: { lat: number; lng: number };
    maxKm: number;
    onChange: (pin: { lat: number; lng: number }) => void;
    // Called with a short address when the customer picks a search result, so the address box can fill itself in.
    onAddress?: (text: string) => void;
}) {
    const box = useRef<HTMLDivElement>(null);
    const map = useRef<LeafletMap | null>(null);
    const marker = useRef<Marker | null>(null);
    const lib = useRef<any>(null);
    const change = useRef(onChange);
    const latest = useRef<Pin>(value);
    change.current = onChange;
    latest.current = value;

    // ---- place search (OpenStreetMap Nominatim, Philippines only) ----
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');
    const abort = useRef<AbortController | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = async (text: string) => {
        const term = text.trim();
        if (term.length < 3) {
            setHits([]);
            setNote('');
            return;
        }

        abort.current?.abort();
        const ctl = new AbortController();
        abort.current = ctl;
        setBusy(true);
        setNote('');

        try {
            const url =
                'https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ph&accept-language=en' +
                `&viewbox=${shop.lng - 0.6},${shop.lat + 0.6},${shop.lng + 0.6},${shop.lat - 0.6}` +
                `&q=${encodeURIComponent(term)}`;
            const res = await fetch(url, { signal: ctl.signal });
            const list: Hit[] = await res.json();
            setHits(list);
            if (list.length === 0)
                setNote(
                    'No place found. Try a barangay or town name, or tap the map.',
                );
        } catch (e: any) {
            if (e?.name !== 'AbortError')
                setNote("Search isn't working right now. Tap the map instead.");
        } finally {
            if (abort.current === ctl) setBusy(false);
        }
    };

    const typing = (text: string) => {
        setQuery(text);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => search(text), 900);
    };

    const pick = (h: Hit) => {
        change.current({
            lat: round(parseFloat(h.lat)),
            lng: round(parseFloat(h.lon)),
        });
        const short = h.display_name.split(',').slice(0, 3).join(',').trim();
        setQuery(h.display_name.split(',').slice(0, 2).join(','));
        if (short.length >= 10) onAddress?.(short);
        setHits([]);
        setNote('Now drag the pin to your exact house or tap the map.');
    };

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
            abort.current?.abort();
        },
        [],
    );

    // Puts the pin where `value` says (creating it the first time) and moves the view to it.
    const place = (pan: boolean) => {
        const L = lib.current;
        const m = map.current;
        const v = latest.current;
        if (!L || !m || !v) return;

        if (!marker.current) {
            marker.current = L.marker([v.lat, v.lng], {
                draggable: true,
                keyboard: false,
                icon: L.divIcon({
                    className: '',
                    html: '<div style="width:22px;height:22px;border-radius:9999px;background:#F0A98B;border:3px solid #0F1E2B;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                }),
            }).addTo(m);
            marker.current!.on('dragend', () => {
                const p = marker.current!.getLatLng();
                change.current({ lat: round(p.lat), lng: round(p.lng) });
            });
        } else {
            marker.current.setLatLng([v.lat, v.lng]);
        }

        if (pan) m.setView([v.lat, v.lng], Math.max(m.getZoom(), 15));
    };

    useEffect(() => {
        let dead = false;

        void (async () => {
            const L = (await import('leaflet')).default;
            if (dead || !box.current) return;
            lib.current = L;

            const m = L.map(box.current, {
                center: [shop.lat, shop.lng],
                zoom: 14,
                scrollWheelZoom: false,
            });
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(m);

            L.circle([shop.lat, shop.lng], {
                radius: maxKm * 1000,
                color: '#F0A98B',
                weight: 2,
                fillColor: '#F0A98B',
                fillOpacity: 0.1,
            }).addTo(m);
            L.marker([shop.lat, shop.lng], {
                interactive: false,
                keyboard: false,
                icon: L.divIcon({
                    className: '',
                    html: '<div style="width:28px;height:28px;border-radius:8px;background:#0F1E2B;color:#F7F1E8;font:700 14px sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid #F7F1E8">S</div>',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                }),
            }).addTo(m);

            m.on('click', (e: any) => {
                m.scrollWheelZoom.enable();
                change.current({
                    lat: round(e.latlng.lat),
                    lng: round(e.latlng.lng),
                });
            });
            m.on('mouseout', () => m.scrollWheelZoom.disable());
            map.current = m;
            place(true);
            setTimeout(() => m.invalidateSize(), 0);
        })();

        return () => {
            dead = true;
            map.current?.remove();
            map.current = null;
            marker.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The pin moved from outside (saved order, "use my location"): follow it.
    useEffect(() => {
        place(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.lat, value?.lng]);

    // "isolate" keeps the map's own layers from floating over the sticky menu bar.
    return (
        <div>
            <div className="relative">
                <input
                    type="search"
                    value={query}
                    placeholder="Search your barangay, street or landmark (e.g. Abuyog)"
                    aria-label="Search for a place"
                    autoComplete="off"
                    className="w-full rounded-full border border-[#0F1E2B]/25 bg-white px-4 py-2 pr-20 text-sm text-[#0F1E2B] transition outline-none focus:border-[#0F1E2B]"
                    onChange={(e) => typing(e.target.value)}
                    // Enter must search, not submit the whole order form.
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            if (timer.current) clearTimeout(timer.current);
                            void search(query);
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={() => search(query)}
                    className="absolute top-1 right-1 rounded-full bg-[#0F1E2B] px-3 py-1 text-xs font-semibold text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B]"
                >
                    {busy ? '…' : 'Search'}
                </button>

                {hits.length > 0 && (
                    <ul
                        role="listbox"
                        className="absolute right-0 left-0 z-20 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-[#0F1E2B]/15 bg-white p-1 shadow-xl"
                    >
                        {hits.map((h) => (
                            <li key={h.place_id}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    onClick={() => pick(h)}
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#0F1E2B] transition hover:bg-[#0F1E2B]/5"
                                >
                                    {h.display_name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {note && <p className="mt-1 text-xs text-[#0F1E2B]/60">{note}</p>}

            {/* "isolate" keeps the map's own layers from floating over the sticky menu bar. */}
            <div
                ref={box}
                className="relative isolate z-0 mt-2 h-64 w-full overflow-hidden rounded-2xl border border-[#0F1E2B]/20"
                aria-label="Map: tap to drop a pin where we should pick up and deliver"
            />
        </div>
    );
}
