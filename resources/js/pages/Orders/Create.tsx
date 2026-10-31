import Req from '@/components/Req';
import { useForm, Head, usePage } from '@inertiajs/react';
import {
    Banknote,
    Camera,
    ChevronDown,
    Smartphone,
    Store,
    Truck,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import LocationPicker from '@/components/LocationPicker';
import Shell from '@/components/Shell';
import { quote, REFUSAL, type Zone } from '@/lib/delivery';
import { directionsLink, reverseGeocode, round6 } from '@/lib/geo';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 4;
const VISIBLE_CHIPS = 5;
const money = (n: number) =>
    '₱' +
    n.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
const fmt = (b: number) =>
    b > 1024 * 1024
        ? `${(b / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(b / 1024)} KB`;

// A numbered heading, so the long form reads as three short steps.
function StepHead({ n, title }: { n: number; title: string }) {
    return (
        <div className="mb-3 flex items-center gap-3">
            <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pw-ink font-sans text-xs font-semibold text-pw-cream"
            >
                {n}
            </span>
            <h2 className="font-serif text-2xl leading-tight text-pw-ink">
                {title}
            </h2>
        </div>
    );
}

export default function Create({
    services,
    saved = [],
    maxSaved = 20,
    zone,
    demoPayments = true,
    readyHours = 24,
}: {
    services: any[];
    saved?: any[];
    maxSaved?: number;
    zone: Zone;
    demoPayments?: boolean;
    readyHours?: number;
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
        pickup_date: '',
        pickup_slot: '',
        photo: null,
        photo_confirmed: false,
        save_as: '',
        save_default_spot: false,
    });

    const [loaded, setLoaded] = useState<any>(fromSaved ?? null);
    const [saveIt, setSaveIt] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locError, setLocError] = useState('');
    const [findingAddress, setFindingAddress] = useState(false);

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

    // The floating total bar shows only while the real submit button is off screen.
    const submitRef = useRef<HTMLButtonElement>(null);
    const [submitInView, setSubmitInView] = useState(false);
    useEffect(() => {
        const el = submitRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(([e]) =>
            setSubmitInView(e.isIntersecting),
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

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
    // Say "kilos" or "loads" once a service is chosen, so nobody has to guess the unit.
    const qtyLabel = !picked
        ? 'Kilos / loads'
        : picked.unit === 'kg'
          ? 'How many kilos?'
          : picked.unit === 'load'
            ? 'How many loads?'
            : `How many (${picked.unit})?`;

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

    const label = 'text-sm font-medium text-pw-ink/80';
    const field =
        'mt-1 w-full border-0 border-b border-pw-ink/30 bg-transparent px-0 py-2 text-base text-pw-ink outline-none transition focus:border-pw-ink focus:shadow-[0_1px_0_0_#F0A98B]';
    const err = (k: string) =>
        errors[k] && <p className="mt-1 text-sm text-red-600">{errors[k]}</p>;

    const choice = (on: boolean) =>
        `rounded-2xl border p-4 text-left transition ${on ? 'border-pw-ink bg-pw-ink text-pw-cream' : 'border-pw-ink/25 hover:bg-pw-ink/5'}`;

    const chip = (x: any) => {
        const on = loaded?.id === x.id;
        return (
            <button
                type="button"
                key={x.id}
                aria-pressed={on}
                onClick={() => chooseSaved(x)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${on ? 'bg-pw-ink text-pw-cream' : 'border border-pw-ink/25 text-pw-ink hover:bg-pw-ink/5'}`}
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
                <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                    Book a wash
                </p>
                <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                    New <span className="text-pw-peach italic">order</span>
                </h1>
            </div>

            <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!locked) post('/orders', { forceFormData: true });
                    }}
                    className="paper grid w-full gap-7 p-6 sm:p-10"
                >
                    {saved.length > 0 && (
                        <div>
                            <div className="flex items-baseline justify-between">
                                <p className={label}>
                                    Saved orders · most recent first
                                </p>
                                <p className="text-xs tracking-widest text-pw-ink/70 uppercase">
                                    {saved.length}/{maxSaved} saved
                                </p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {shownChips.map(chip)}

                                {restChips.length > 0 && (
                                    <select
                                        aria-label="More saved orders"
                                        value={loadedInRest ? String(loadedInRest.id) : ''}
                                        onChange={(e) => {
                                            const x = restChips.find(
                                                (r) => String(r.id) === e.target.value,
                                            );
                                            if (x) chooseSaved(x);
                                        }}
                                        className={`rounded-full px-4 py-2.5 text-sm font-semibold ${loadedInRest ? 'bg-pw-ink text-pw-cream' : 'border border-dashed border-pw-ink/40 bg-transparent text-pw-ink'}`}
                                    >
                                        <option value="">
                                            More saved orders ({restChips.length})
                                        </option>
                                        {restChips.map((x) => (
                                            <option key={x.id} value={x.id}>
                                                {x.name} · {x.service_name ?? 'Service removed'} · {x.quantity} {x.unit}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {loaded && (
                                <p className="mt-2 text-xs text-pw-ink/70">
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
                        <StepHead n={1} title="Pick your service" />
                        <p className="mb-2 text-xs text-pw-ink/70">
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
                            {qtyLabel} <Req />
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
                                className="h-11 w-11 shrink-0 rounded-full border border-pw-ink/25 text-lg transition hover:bg-pw-ink/5"
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
                                className="h-11 w-11 shrink-0 rounded-full border border-pw-ink/25 text-lg transition hover:bg-pw-ink/5"
                            >
                                +
                            </button>
                        </div>
                        {err('quantity')}
                        {picked && qty > 0 && (
                            <p
                                aria-live="polite"
                                className="mt-3 rounded-2xl bg-pw-ink/5 px-4 py-3 text-sm text-pw-ink"
                            >
                                {qty} {picked.unit} × {money(Number(picked.price))} ={' '}
                                <span className="font-semibold">{money(laundry)}</span>
                                {readyHours > 0 && (
                                    <span className="text-pw-ink/70">
                                        {' '}· usually ready in about{' '}
                                        {readyHours % 24 === 0
                                            ? `${readyHours / 24} ${readyHours === 24 ? 'day' : 'days'}`
                                            : `${readyHours} hours`}
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-pw-ink/10 pt-7">
                        <StepHead n={2} title="How do we get your laundry?" />
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
                                <span className="flex items-center gap-2 text-sm font-semibold">
<Truck aria-hidden="true" className="h-5 w-5 shrink-0" />
<span>We pick up &amp; deliver</span>
</span>
                                <span
                                    className={`block text-xs ${delivery ? 'text-pw-cream/70' : 'text-pw-ink/70'}`}
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
                                <span className="flex items-center gap-2 text-sm font-semibold">
<Store aria-hidden="true" className="h-5 w-5 shrink-0" />
<span>I&apos;ll drop off &amp; collect</span>
</span>
                                <span
                                    className={`block text-xs ${!delivery ? 'text-pw-cream/70' : 'text-pw-ink/70'}`}
                                >
                                    At the shop. No fee, no address needed
                                </span>
                            </button>
                        </div>
                        {err('fulfillment')}
                    </div>

                    <div>
                        <p className={label}>
                            {delivery
                                ? 'When should we come? (optional)'
                                : 'When will you drop it off? (optional)'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <input
                                type="date"
                                aria-label="Preferred day"
                                value={data.pickup_date}
                                min={new Date().toISOString().slice(0, 10)}
                                max={new Date(Date.now() + 7 * 86400000)
                                    .toISOString()
                                    .slice(0, 10)}
                                onChange={(e) =>
                                    setData('pickup_date', e.target.value)
                                }
                                className="rounded-xl border border-pw-ink/25 bg-white px-4 py-3 text-base"
                            />
                            {[
                                ['morning', 'Morning'],
                                ['afternoon', 'Afternoon'],
                            ].map(([v, l]) => (
                                <button
                                    key={v}
                                    type="button"
                                    aria-pressed={data.pickup_slot === v}
                                    onClick={() =>
                                        setData(
                                            'pickup_slot',
                                            data.pickup_slot === v ? '' : v,
                                        )
                                    }
                                    className={choice(data.pickup_slot === v)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                        {err('pickup_date')}
                        {err('pickup_slot')}
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
                                        className="rounded-full border border-pw-ink/25 px-4 py-2 text-xs font-semibold transition hover:bg-pw-ink/5 disabled:opacity-50"
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
                                <p className="mt-2 text-xs text-pw-ink/70">
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
                                            className="rounded-full border border-pw-ink/25 px-4 py-2 text-xs font-semibold transition hover:bg-pw-ink/5"
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
                                            className="rounded-full border border-pw-ink/25 px-4 py-2 text-xs font-semibold transition hover:bg-pw-ink/5 disabled:opacity-50"
                                        >
                                            {findingAddress
                                                ? 'Finding address…'
                                                : 'Fill address from pin'}
                                        </button>
                                    )}
                                </div>
                                {pinIsHome && (
                                    <p className="mt-2 text-xs text-pw-ink/70">
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
                                            className="h-5 w-5 accent-pw-peach"
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
                                    <p className="mt-2 text-sm text-pw-ink/70">
                                        No pin yet. Tap the map to drop one.
                                    </p>
                                )}
                                {pin && zoneQuote?.deliverable && (
                                    <p className="mt-2 rounded-xl bg-pw-ok/10 px-3 py-2 text-sm text-pw-ok-deep">
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
                        <div className="rounded-2xl border border-dashed border-pw-ink/25 p-4 text-sm text-pw-ink/75">
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
                                className="mt-2 block text-sm font-semibold text-pw-rust hover:underline"
                            >
                                Get directions to the shop
                            </a>
                        </div>
                    )}

                    <details
                        className="group border-t border-pw-ink/10 pt-7"
                        open={Boolean(
                            data.instructions ||
                                data.photo ||
                                errors.instructions ||
                                errors.photo ||
                                errors.photo_confirmed,
                        )}
                    >
                        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl border-2 border-pw-ink/25 bg-white/40 px-4 py-3 transition hover:border-pw-ink/50 hover:bg-white/70 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
                            <span
                                aria-hidden="true"
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pw-ink font-sans text-xs font-semibold text-pw-cream"
                            >
                                3
                            </span>
                            <Camera
                                aria-hidden="true"
                                className="h-5 w-5 shrink-0 text-pw-ink/70"
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block font-serif text-xl leading-tight">
                                    Add a note or photo (optional)
                                </span>
                                <span className="block text-sm text-pw-ink/70 group-open:hidden">
                                    Tap the arrow to open
                                </span>
                                <span className="hidden text-sm text-pw-ink/70 group-open:block">
                                    Tap the arrow to close
                                </span>
                            </span>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pw-ink text-pw-cream">
                                <ChevronDown
                                    aria-hidden="true"
                                    className="h-5 w-5 transition-transform duration-200 group-open:rotate-180"
                                />
                            </span>
                        </summary>
                        <div className="mt-4 grid gap-6">
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
                            <div className="mt-3 rounded-2xl border border-dashed border-pw-ink/25 p-3">
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
                                        <p className="text-xs text-pw-ink/70">
                                            {fmt(data.photo.size)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={clear}
                                            className="mt-1 text-sm font-semibold text-pw-rust hover:underline"
                                        >
                                            Remove / Choose another
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-pw-ink/70">
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
                                        className="h-5 w-5 accent-pw-peach"
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

                        </div>
                    </details>

                    <div className="border-t border-pw-ink/10 pt-7">
                        <StepHead n={4} title="How will you pay?" />
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
                                <span className="flex items-center gap-2 text-sm font-semibold">
<Banknote aria-hidden="true" className="h-5 w-5 shrink-0" />
<span>Cash</span>
</span>
                                <span
                                    className={`block text-xs ${!gcash ? 'text-pw-cream/70' : 'text-pw-ink/70'}`}
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
                                <span className="flex items-center gap-2 text-sm font-semibold">
<Smartphone aria-hidden="true" className="h-5 w-5 shrink-0" />
<span>GCash{demoPayments ? ' (demo)' : ''}</span>
</span>
                                <span
                                    className={`block text-xs ${gcash ? 'text-pw-cream/70' : 'text-pw-ink/70'}`}
                                >
                                    {demoPayments
                                        ? 'Practice payment. No real money moves'
                                        : 'Pay online right after you order'}
                                </span>
                            </button>
                        </div>
                        {err('payment_method')}
                    </div>

                    <div className="rounded-2xl border border-dashed border-pw-ink/25 p-4">
                        <label
                            htmlFor="save_it"
                            className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                            <input
                                id="save_it"
                                type="checkbox"
                                className="h-5 w-5 accent-pw-peach"
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
                                <p className="mt-2 text-xs text-pw-ink/70">
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

                    <div className="border-t border-dashed border-pw-ink/25 pt-5">
                        <div className="flex justify-between text-sm text-pw-ink/70">
                            <span>Laundry</span>
                            <span>{money(laundry)}</span>
                        </div>
                        {delivery && (
                            <div className="mt-1 flex justify-between text-sm text-pw-ink/70">
                                <span>Delivery fee</span>
                                <span>
                                    {zoneQuote?.deliverable
                                        ? money(fee)
                                        : 'Pin your spot'}
                                </span>
                            </div>
                        )}
                        <div className="mt-3 flex items-end justify-between">
                            <span className="text-xs tracking-widest text-pw-ink/70 uppercase">
                                Total
                            </span>
                            <span className="font-sans text-4xl font-semibold tabular-nums">
                                {money(total)}
                            </span>
                        </div>
                        {picked && readyHours > 0 && (
                            <p className="mt-3 text-xs text-pw-ink/70">
                                Usually ready within about{' '}
                                {readyHours % 24 === 0
                                    ? `${readyHours / 24} ${readyHours === 24 ? 'day' : 'days'}`
                                    : `${readyHours} hours`}
                                . Your status updates as we go.
                            </p>
                        )}
                    </div>

                    <button
                        ref={submitRef}
                        disabled={locked}
                        className="btn btn-navy w-full py-3 text-base"
                    >
                        {processing
                            ? 'Sending...'
                            : gcash
                              ? 'Place order & pay with GCash'
                              : 'Submit order'}
                    </button>
                    {lockReason && !processing && (
                        <p className="-mt-3 text-center text-xs text-pw-ink/70">
                            {lockReason}
                        </p>
                    )}

                    {picked && !submitInView && (
                        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-4">
                            <div className="paper mx-auto flex max-w-xl items-center justify-between gap-3 !rounded-2xl p-3 pl-5">
                                <div className="min-w-0">
                                    <p className="text-xs tracking-widest text-pw-ink/70 uppercase">
                                        Total
                                    </p>
                                    <p className="font-sans text-2xl font-semibold tabular-nums">
                                        {money(total)}
                                    </p>
                                </div>
                                {locked && !processing ? (
                                    <p className="max-w-[55%] text-right text-xs text-pw-ink/70">
                                        {lockReason}
                                    </p>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={locked}
                                        className="btn btn-navy"
                                    >
                                        {processing
                                            ? 'Sending...'
                                            : gcash
                                              ? 'Place order & pay'
                                              : 'Place order'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </Shell>
    );
}