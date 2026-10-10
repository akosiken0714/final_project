import Req from '@/components/Req';
import { useForm, Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import LocationPicker from '@/components/LocationPicker';
import Shell from '@/components/Shell';
import { quote, REFUSAL, type Zone } from '@/lib/delivery';
import { directionsLink, reverseGeocode, round6 } from '@/lib/geo';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 4;
const VISIBLE_CHIPS = 5;
const fmt = (b: number) =>
    b > 1024 * 1024
        ? `${(b / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(b / 1024)} KB`;

export default function Create({
    services,
    saved = [],
    maxSaved = 20,
    zone,
    demoPayments = true,
}: {
    services: any[];
    saved?: any[];
    maxSaved?: number;
    zone: Zone;
    demoPayments?: boolean;
}) {
    const { auth }: any = usePage().props;
    const q = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : '',
    );

    // Opened from "Order this" on a saved order (?saved=ID): start with its details filled in.
    const fromSaved = saved.find((x) => String(x.id) === q.get('saved'));
    const fill = (x: any) => ({
        service_id: x.available ? String(x.service_id) : '',
        quantity: String(x.quantity),
        fulfillment: x.fulfillment === 'dropoff' ? 'dropoff' : 'delivery',
        address: x.address ?? '',
        lat: x.lat ?? null,
        lng: x.lng ?? null,
        instructions: x.instructions ?? '',
        saved_order_id: x.id,
    });

    const { data, setData, post, processing, errors } = useForm<any>({
        ...(fromSaved
            ? fill(fromSaved)
            : {
                  service_id: q.get('service') ?? '',
                  quantity: q.get('quantity') ?? '1',
                  fulfillment: 'delivery',
                  address: auth?.user?.address ?? '',
                  // The usual spot and rider notes from Settings, so there's nothing to re-enter.
                  lat: auth?.user?.default_lat ?? null,
                  lng: auth?.user?.default_lng ?? null,
                  instructions: auth?.user?.delivery_notes ?? '',
                  saved_order_id: '',
              }),
        payment_method: 'cash',
        photo: null,
        photo_confirmed: false,
        save_as: '',
        save_default_spot: false,
    });

    const [loaded, setLoaded] = useState<any>(fromSaved ?? null);
    const [saveIt, setSaveIt] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locError, setLocError] = useState('');
    const [findingAddress, setFindingAddress] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const [photoError, setPhotoError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const preview = useMemo(
        () => (data.photo ? URL.createObjectURL(data.photo) : null),
        [data.photo],
    );
    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview],
    );

    // Close the "More…" list when clicking elsewhere or pressing Escape.
    useEffect(() => {
        if (!moreOpen) return;
        const away = (e: MouseEvent) => {
            if (!moreRef.current?.contains(e.target as Node))
                setMoreOpen(false);
        };
        const esc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMoreOpen(false);
        };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('keydown', esc);
        };
    }, [moreOpen]);

    const delivery = data.fulfillment === 'delivery';
    const pin =
        data.lat != null && data.lng != null
            ? { lat: Number(data.lat), lng: Number(data.lng) }
            : null;
    // The spot saved in Settings (if any), and whether the pin on the map is that spot.
    const home =
        auth?.user?.default_lat != null && auth?.user?.default_lng != null
            ? {
                  lat: Number(auth.user.default_lat),
                  lng: Number(auth.user.default_lng),
              }
            : null;
    const pinIsHome =
        !!pin &&
        !!home &&
        Math.abs(pin.lat - home.lat) < 0.00001 &&
        Math.abs(pin.lng - home.lng) < 0.00001;
    const zoneQuote = useMemo(
        () => (pin ? quote(zone, pin.lat, pin.lng) : null),
        [pin?.lat, pin?.lng, zone],
    );
    const outOfRange = delivery && !!zoneQuote && !zoneQuote.deliverable;

    const picked = services.find((s) => s.id == data.service_id);
    const qty = parseInt(data.quantity, 10) || 0;
    const laundry = picked ? picked.price * qty : 0;
    const fee = delivery && zoneQuote?.deliverable ? Number(zoneQuote.fee) : 0;
    const total = laundry + fee;
    const gcash = data.payment_method === 'gcash';

    // Why the button is greyed out, so the customer is never left guessing.
    const lockReason = !picked
        ? 'Choose a service to continue.'
        : qty < 1
          ? 'Enter how many kilos or loads.'
          : delivery && data.address.trim().length < 10
            ? 'Enter your pickup and delivery address.'
            : delivery && !pin
              ? 'Drop a pin on the map.'
              : outOfRange
                ? REFUSAL
                : data.photo && !data.photo_confirmed
                  ? 'Tick the box to confirm your photo.'
                  : saveIt && !data.save_as.trim()
                    ? 'Name your saved order, or untick “Save this order”.'
                    : '';

    const locked =
        processing ||
        !!lockReason ||
        qty < 1 ||
        (!!data.photo && !data.photo_confirmed) ||
        (saveIt && !data.save_as.trim()) ||
        (delivery && (!pin || outOfRange));

    const chooseSaved = (x: any) => {
        setLoaded(x);
        setSaveIt(false);
        setMoreOpen(false);
        setData((d: any) => ({ ...d, ...fill(x), save_as: '' }));
    };

    const toggleSave = (on: boolean) => {
        setSaveIt(on);
        setData(
            'save_as',
            on ? String(loaded?.name ?? picked?.name ?? '').slice(0, 40) : '',
        );
    };

    const setPin = (p: { lat: number; lng: number }) =>
        setData((d: any) => ({ ...d, lat: p.lat, lng: p.lng }));

    // Looks up a street address for the pin. With onlyIfEmpty it never overwrites what the customer typed.
    const fillAddress = async (
        p: { lat: number; lng: number },
        onlyIfEmpty: boolean,
    ) => {
        setFindingAddress(true);
        const found = await reverseGeocode(p.lat, p.lng);
        setFindingAddress(false);
        if (!found) return;
        setData((d: any) =>
            onlyIfEmpty && String(d.address).trim() !== ''
                ? d
                : { ...d, address: found },
        );
    };

    // Moving the pin also fills in an empty address, so the customer only has to tap the map.
    const movePin = (p: { lat: number; lng: number }) => {
        setPin(p);
        void fillAddress(p, true);
    };

    const useSavedSpot = () => {
        if (!home) return;
        setData((d: any) => ({
            ...d,
            lat: home.lat,
            lng: home.lng,
            address: auth?.user?.address || d.address,
        }));
    };

    const useMyLocation = () => {
        setLocError('');
        if (!navigator.geolocation) {
            setLocError(
                'Your browser cannot share its location. Tap the map instead.',
            );
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocating(false);
                movePin({
                    lat: round6(pos.coords.latitude),
                    lng: round6(pos.coords.longitude),
                });
            },
            () => {
                setLocating(false);
                setLocError(
                    "We couldn't get your location. Tap the map instead.",
                );
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const clear = () => {
        setData((d: any) => ({ ...d, photo: null, photo_confirmed: false }));
        if (fileRef.current) fileRef.current.value = '';
    };

    const choose = (f?: File | null) => {
        setPhotoError('');
        if (!f) return;
        if (!ALLOWED.includes(f.type)) {
            setPhotoError('Please choose a JPG, PNG or WebP photo.');
            clear();
            return;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
            setPhotoError(
                `That photo is ${fmt(f.size)}. Please keep it under ${MAX_MB} MB.`,
            );
            clear();
            return;
        }
        setData((d: any) => ({ ...d, photo: f, photo_confirmed: false }));
    };

    const label = 'text-[10px] uppercase tracking-[0.25em] text-[#0F1E2B]/55';
    const field =
        'mt-1 w-full border-0 border-b border-[#0F1E2B]/30 bg-transparent px-0 py-2 text-base text-[#0F1E2B] outline-none transition focus:border-[#0F1E2B] focus:shadow-[0_1px_0_0_#F0A98B]';
    const err = (k: string) =>
        errors[k] && <p className="mt-1 text-sm text-red-600">{errors[k]}</p>;

    const choice = (on: boolean) =>
        `rounded-2xl border p-4 text-left transition ${on ? 'border-[#0F1E2B] bg-[#0F1E2B] text-[#F7F1E8]' : 'border-[#0F1E2B]/25 hover:bg-[#0F1E2B]/5'}`;

    const chip = (x: any) => {
        const on = loaded?.id === x.id;
        return (
            <button
                type="button"
                key={x.id}
                aria-pressed={on}
                onClick={() => chooseSaved(x)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${on ? 'bg-[#0F1E2B] text-[#F7F1E8]' : 'border border-[#0F1E2B]/25 text-[#0F1E2B] hover:bg-[#0F1E2B]/5'}`}
            >
                {x.name}
            </button>
        );
    };

    const shownChips = saved.slice(0, VISIBLE_CHIPS);
    const restChips = saved.slice(VISIBLE_CHIPS);
    const loadedInRest = restChips.find((x) => x.id === loaded?.id);

    return (
        <Shell>
            <Head title="New Order" />
            <div className="text-center">
                <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                    Book a wash
                </p>
                <h1 className="mt-3 font-serif text-5xl md:text-6xl">
                    New <span className="text-[#F0A98B] italic">order</span>
                </h1>
            </div>

            <div className="mx-auto mt-10 flex max-w-xl flex-col items-center">
                <div className="z-10 h-10 w-3 rounded-sm bg-[#F0A98B] shadow-md shadow-black/30" />
                <div className="-mt-1 h-8 w-px bg-[#F7F1E8]/40" />

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!locked) post('/orders', { forceFormData: true });
                    }}
                    className="grid w-full gap-6 rounded-[2rem] bg-[#F7F1E8] p-8 text-[#0F1E2B] shadow-2xl ring-1 shadow-black/40 ring-[#0F1E2B]/5"
                >
                    <div className="mx-auto h-4 w-4 rounded-full border-2 border-[#0F1E2B]/40" />

                    {saved.length > 0 && (
                        <div>
                            <div className="flex items-baseline justify-between">
                                <p className={label}>
                                    Saved orders · most recent first
                                </p>
                                <p className="text-[10px] tracking-widest text-[#0F1E2B]/45 uppercase">
                                    {saved.length}/{maxSaved} saved
                                </p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {shownChips.map(chip)}

                                {restChips.length > 0 && (
                                    <div ref={moreRef} className="relative">
                                        <button
                                            type="button"
                                            aria-haspopup="listbox"
                                            aria-expanded={moreOpen}
                                            onClick={() =>
                                                setMoreOpen((o) => !o)
                                            }
                                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${loadedInRest ? 'bg-[#0F1E2B] text-[#F7F1E8]' : 'border border-dashed border-[#0F1E2B]/40 text-[#0F1E2B] hover:bg-[#0F1E2B]/5'}`}
                                        >
                                            {loadedInRest
                                                ? `${loadedInRest.name} ▾`
                                                : `More… (${restChips.length}) ▾`}
                                        </button>

                                        {moreOpen && (
                                            <div
                                                role="listbox"
                                                className="absolute left-0 z-20 mt-2 max-h-56 w-64 overflow-y-auto rounded-2xl border border-[#0F1E2B]/15 bg-white p-1 shadow-xl"
                                            >
                                                {restChips.map((x) => (
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        aria-selected={
                                                            loaded?.id === x.id
                                                        }
                                                        key={x.id}
                                                        onClick={() =>
                                                            chooseSaved(x)
                                                        }
                                                        className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[#0F1E2B]/5 ${loaded?.id === x.id ? 'bg-[#F0A98B]/30 font-semibold' : ''}`}
                                                    >
                                                        {x.name}
                                                        <span className="block text-xs text-[#0F1E2B]/50">
                                                            {x.service_name ??
                                                                'Service removed'}{' '}
                                                            · {x.quantity}{' '}
                                                            {x.unit}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {loaded && (
                                <p className="mt-2 text-xs text-[#0F1E2B]/60">
                                    Loaded “{loaded.name}”. Change anything you
                                    like before you submit.
                                    {!loaded.available &&
                                        ' That service is not available any more, so please pick another one.'}
                                    {loaded.fulfillment !== 'dropoff' &&
                                        loaded.lat == null &&
                                        ' Drop a pin on the map for this one.'}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <p className="mb-2 text-xs text-[#0F1E2B]/55">
                            <span className="font-semibold text-red-600">
                                *
                            </span>{' '}
                            required
                        </p>
                        <label htmlFor="service" className={label}>
                            Service <Req />
                        </label>
                        <select
                            id="service"
                            className={field}
                            value={data.service_id}
                            onChange={(e) =>
                                setData('service_id', e.target.value)
                            }
                        >
                            <option value="">Choose a service</option>
                            {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} — ₱{s.price}/{s.unit}
                                </option>
                            ))}
                        </select>
                        {err('service_id')}
                    </div>

                    <div>
                        <label htmlFor="quantity" className={label}>
                            Kilos / loads (whole numbers) <Req />
                        </label>
                        <div className="mt-1 flex items-center gap-3">
                            <button
                                type="button"
                                aria-label="One less"
                                onClick={() =>
                                    setData(
                                        'quantity',
                                        String(Math.max(1, qty - 1)),
                                    )
                                }
                                className="h-10 w-10 shrink-0 rounded-full border border-[#0F1E2B]/25 text-lg transition hover:bg-[#0F1E2B]/5"
                            >
                                −
                            </button>
                            <input
                                id="quantity"
                                type="number"
                                inputMode="numeric"
                                step="1"
                                min="1"
                                max="100"
                                className={`${field} mt-0 text-center`}
                                value={data.quantity}
                                onChange={(e) =>
                                    setData(
                                        'quantity',
                                        e.target.value.replace(/\D/g, ''),
                                    )
                                }
                            />
                            <button
                                type="button"
                                aria-label="One more"
                                onClick={() =>
                                    setData(
                                        'quantity',
                                        String(Math.min(100, qty + 1)),
                                    )
                                }
                                className="h-10 w-10 shrink-0 rounded-full border border-[#0F1E2B]/25 text-lg transition hover:bg-[#0F1E2B]/5"
                            >
                                +
                            </button>
                        </div>
                        {err('quantity')}
                    </div>

                    <div>
                        <p className={label}>How do we get your laundry?</p>
                        <div
                            className="mt-2 grid gap-3 sm:grid-cols-2"
                            role="radiogroup"
                            aria-label="Pickup or drop-off"
                        >
                            <button
                                type="button"
                                role="radio"
                                aria-checked={delivery}
                                onClick={() =>
                                    setData('fulfillment', 'delivery')
                                }
                                className={choice(delivery)}
                            >
                                <span className="block text-sm font-semibold">
                                    We pick up &amp; deliver
                                </span>
                                <span
                                    className={`block text-xs ${delivery ? 'text-[#F7F1E8]/70' : 'text-[#0F1E2B]/55'}`}
                                >
                                    From ₱{zone.tiers[0]?.fee ?? 0} delivery
                                    fee, by distance
                                </span>
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={!delivery}
                                onClick={() =>
                                    setData('fulfillment', 'dropoff')
                                }
                                className={choice(!delivery)}
                            >
                                <span className="block text-sm font-semibold">
                                    I&apos;ll drop off &amp; collect
                                </span>
                                <span
                                    className={`block text-xs ${!delivery ? 'text-[#F7F1E8]/70' : 'text-[#0F1E2B]/55'}`}
                                >
                                    At the shop. No fee, no address needed
                                </span>
                            </button>
                        </div>
                        {err('fulfillment')}
                    </div>

                    {delivery ? (
                        <div className="grid gap-4">
                            <div>
                                <label htmlFor="address" className={label}>
                                    Pickup / delivery address <Req />
                                </label>
                                <input
                                    id="address"
                                    type="text"
                                    autoComplete="street-address"
                                    placeholder="House no., street, barangay, city"
                                    className={field}
                                    value={data.address}
                                    onChange={(e) =>
                                        setData('address', e.target.value)
                                    }
                                />
                                {err('address')}
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className={label}>
                                        Pin your spot on the map
                                    </p>
                                    <button
                                        type="button"
                                        onClick={useMyLocation}
                                        disabled={locating}
                                        className="rounded-full border border-[#0F1E2B]/25 px-4 py-1 text-xs font-semibold transition hover:bg-[#0F1E2B]/5 disabled:opacity-50"
                                    >
                                        {locating
                                            ? 'Locating…'
                                            : 'Use my location'}
                                    </button>
                                </div>
                                <div className="mt-2">
                                    <LocationPicker
                                        value={pin}
                                        shop={zone.shop}
                                        maxKm={zone.max_km}
                                        onChange={movePin}
                                        onAddress={(t) =>
                                            setData((d: any) =>
                                                String(d.address).trim() === ''
                                                    ? { ...d, address: t }
                                                    : d,
                                            )
                                        }
                                    />
                                </div>
                                <p className="mt-2 text-xs text-[#0F1E2B]/55">
                                    Tap the map or drag the pin. S is{' '}
                                    {zone.shop.name}; the peach circle is where
                                    we deliver (up to {zone.max_km} km).
                                </p>
                                {locError && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {locError}
                                    </p>
                                )}

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {home && !pinIsHome && (
                                        <button
                                            type="button"
                                            onClick={useSavedSpot}
                                            className="rounded-full border border-[#0F1E2B]/25 px-4 py-1 text-xs font-semibold transition hover:bg-[#0F1E2B]/5"
                                        >
                                            Use my saved spot
                                        </button>
                                    )}
                                    {pin && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                fillAddress(pin, false)
                                            }
                                            disabled={findingAddress}
                                            className="rounded-full border border-[#0F1E2B]/25 px-4 py-1 text-xs font-semibold transition hover:bg-[#0F1E2B]/5 disabled:opacity-50"
                                        >
                                            {findingAddress
                                                ? 'Finding address…'
                                                : 'Fill address from pin'}
                                        </button>
                                    )}
                                </div>
                                {pinIsHome && (
                                    <p className="mt-2 text-xs text-[#0F1E2B]/55">
                                        This is your saved spot. Change it any
                                        time in Settings.
                                    </p>
                                )}
                                {pin && !pinIsHome && (
                                    <label
                                        htmlFor="save_default_spot"
                                        className="mt-2 flex cursor-pointer items-center gap-2 text-sm"
                                    >
                                        <input
                                            id="save_default_spot"
                                            type="checkbox"
                                            className="h-4 w-4 accent-[#F0A98B]"
                                            checked={!!data.save_default_spot}
                                            onChange={(e) =>
                                                setData(
                                                    'save_default_spot',
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        {home
                                            ? 'Make this my usual spot'
                                            : 'Remember this as my usual spot'}
                                    </label>
                                )}

                                {!pin && (
                                    <p className="mt-2 text-sm text-[#0F1E2B]/70">
                                        No pin yet. Tap the map to drop one.
                                    </p>
                                )}
                                {pin && zoneQuote?.deliverable && (
                                    <p className="mt-2 rounded-xl bg-[#2f7d5b]/10 px-3 py-2 text-sm text-[#1f5a40]">
                                        {zoneQuote.km.toFixed(1)} km from the
                                        shop · delivery fee{' '}
                                        <strong>
                                            ₱{Number(zoneQuote.fee).toFixed(2)}
                                        </strong>
                                    </p>
                                )}
                                {outOfRange && (
                                    <p
                                        role="alert"
                                        className="mt-2 rounded-xl bg-red-600/10 px-3 py-2 text-sm font-semibold text-red-700"
                                    >
                                        {REFUSAL} It&apos;s{' '}
                                        {zoneQuote!.km.toFixed(1)} km away. Move
                                        the pin closer, or choose
                                        &ldquo;I&apos;ll drop off &amp;
                                        collect&rdquo;.
                                    </p>
                                )}
                                {!outOfRange && (err('lat') || err('lng'))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[#0F1E2B]/25 p-4 text-sm text-[#0F1E2B]/75">
                            Bring your laundry to{' '}
                            <strong>{zone.shop.name}</strong>
                            {zone.shop.address
                                ? ` (${zone.shop.address})`
                                : ''}{' '}
                            and collect it there when it&apos;s ready. No
                            delivery fee.
                            <a
                                href={directionsLink(
                                    zone.shop.lat,
                                    zone.shop.lng,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 block text-xs font-semibold tracking-widest text-[#C96F48] uppercase hover:underline"
                            >
                                Get directions to the shop
                            </a>
                        </div>
                    )}

                    <div>
                        <label htmlFor="instructions" className={label}>
                            Special instructions
                        </label>
                        <textarea
                            id="instructions"
                            rows={3}
                            className={`${field} resize-none`}
                            value={data.instructions}
                            onChange={(e) =>
                                setData('instructions', e.target.value)
                            }
                        />
                        {err('instructions')}
                    </div>

                    <div>
                        <label htmlFor="photo" className={label}>
                            Photo of items (optional)
                        </label>
                        {!data.photo && (
                            <input
                                id="photo"
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className={`${field} text-sm`}
                                onChange={(e) => choose(e.target.files?.[0])}
                            />
                        )}
                        {photoError && (
                            <p className="mt-1 text-sm text-red-600">
                                {photoError}
                            </p>
                        )}
                        {err('photo')}

                        {data.photo && preview && (
                            <div className="mt-3 rounded-2xl border border-dashed border-[#0F1E2B]/25 p-3">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={preview}
                                        alt="Selected laundry photo"
                                        className="h-20 w-20 rounded-xl object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">
                                            {data.photo.name}
                                        </p>
                                        <p className="text-xs text-[#0F1E2B]/60">
                                            {fmt(data.photo.size)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={clear}
                                            className="mt-1 text-xs font-semibold tracking-widest text-[#C96F48] uppercase hover:underline"
                                        >
                                            Remove / Choose another
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-[#0F1E2B]/60">
                                    Only send photos of your laundry. Don't
                                    include faces, documents or your home.
                                </p>
                                <label
                                    htmlFor="photo_confirmed"
                                    className="mt-3 flex cursor-pointer items-center gap-2 text-sm"
                                >
                                    <input
                                        id="photo_confirmed"
                                        type="checkbox"
                                        className="h-4 w-4 accent-[#F0A98B]"
                                        checked={data.photo_confirmed}
                                        onChange={(e) =>
                                            setData(
                                                'photo_confirmed',
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    I've checked this photo.
                                </label>
                                {err('photo_confirmed')}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className={label}>Payment</p>
                        <div
                            className="mt-2 grid gap-3 sm:grid-cols-2"
                            role="radiogroup"
                            aria-label="Payment method"
                        >
                            <button
                                type="button"
                                role="radio"
                                aria-checked={!gcash}
                                onClick={() =>
                                    setData('payment_method', 'cash')
                                }
                                className={choice(!gcash)}
                            >
                                <span className="block text-sm font-semibold">
                                    Cash
                                </span>
                                <span
                                    className={`block text-xs ${!gcash ? 'text-[#F7F1E8]/70' : 'text-[#0F1E2B]/55'}`}
                                >
                                    {delivery
                                        ? 'Pay when we hand it back'
                                        : 'Pay when you collect it'}
                                </span>
                            </button>
                            <button
                                type="button"
                                role="radio"
                                aria-checked={gcash}
                                onClick={() =>
                                    setData('payment_method', 'gcash')
                                }
                                className={choice(gcash)}
                            >
                                <span className="block text-sm font-semibold">
                                    GCash{demoPayments ? ' (demo)' : ''}
                                </span>
                                <span
                                    className={`block text-xs ${gcash ? 'text-[#F7F1E8]/70' : 'text-[#0F1E2B]/55'}`}
                                >
                                    {demoPayments
                                        ? 'Practice payment. No real money moves'
                                        : 'Pay online right after you order'}
                                </span>
                            </button>
                        </div>
                        {err('payment_method')}
                    </div>

                    <div className="rounded-2xl border border-dashed border-[#0F1E2B]/25 p-4">
                        <label
                            htmlFor="save_it"
                            className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                            <input
                                id="save_it"
                                type="checkbox"
                                className="h-4 w-4 accent-[#F0A98B]"
                                checked={saveIt}
                                onChange={(e) => toggleSave(e.target.checked)}
                            />
                            Save this order for next time
                        </label>
                        {saveIt && (
                            <>
                                <input
                                    type="text"
                                    maxLength={40}
                                    placeholder="Name it (for example: Weekly wash)"
                                    aria-label="Name for this saved order"
                                    className={field}
                                    value={data.save_as}
                                    onChange={(e) =>
                                        setData('save_as', e.target.value)
                                    }
                                />
                                {err('save_as')}
                                <p className="mt-2 text-xs text-[#0F1E2B]/55">
                                    Saves the service, amount, how we get it,
                                    address, pin and notes. Photos and payment
                                    are not saved.{' '}
                                    {loaded
                                        ? `Keep the name “${loaded.name}” to update it.`
                                        : 'Using a name you already have updates that one.'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="border-t border-dashed border-[#0F1E2B]/25 pt-5">
                        <div className="flex justify-between text-sm text-[#0F1E2B]/70">
                            <span>Laundry</span>
                            <span>₱{laundry.toFixed(2)}</span>
                        </div>
                        {delivery && (
                            <div className="mt-1 flex justify-between text-sm text-[#0F1E2B]/70">
                                <span>Delivery fee</span>
                                <span>
                                    {zoneQuote?.deliverable
                                        ? `₱${fee.toFixed(2)}`
                                        : 'Pin your spot'}
                                </span>
                            </div>
                        )}
                        <div className="mt-3 flex items-end justify-between">
                            <span className="text-[10px] tracking-widest text-[#0F1E2B]/50 uppercase">
                                Total
                            </span>
                            <span className="font-serif text-4xl">
                                ₱{total.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <button
                        disabled={locked}
                        className="w-full rounded-full bg-[#0F1E2B] px-8 py-3 font-semibold text-[#F7F1E8] transition hover:-translate-y-0.5 hover:bg-[#F0A98B] hover:text-[#0F1E2B] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing
                            ? 'Sending...'
                            : gcash
                              ? 'Place order & pay with GCash'
                              : 'Submit order'}
                    </button>
                    {lockReason && !processing && (
                        <p className="-mt-3 text-center text-xs text-[#0F1E2B]/60">
                            {lockReason}
                        </p>
                    )}
                </form>
            </div>
        </Shell>
    );
}
