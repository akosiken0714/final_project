import { Link, Head, router, usePage } from '@inertiajs/react';
import { ChevronDown, Store, Truck } from 'lucide-react';
import { useState } from 'react';
import OrderTracker from '@/components/OrderTracker';
import PaymentBadge from '@/components/PaymentBadge';
import RateOrder from '@/components/RateOrder';
import Shell from '@/components/Shell';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import StatusBadge from '@/components/StatusBadge';
import { LoadMore, OrderViewTabs } from '@/components/OrderViewTabs';

const pickupSteps = ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'];
const deliverySteps = [
    'Pending',
    'In Progress',
    'Out for Delivery',
    'Completed',
];
const day = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
const tag = (id: number) => '#' + String(id).padStart(4, '0');
const qtyOf = (o: any) => Math.max(1, Math.ceil(Number(o.quantity)));
const peso = (n: number | string) => '₱' + Number(n).toFixed(2);
const SAVED_PREVIEW = 3;

// One small in-app question box replaces the browser's alert / confirm / prompt pop-ups.
type Ask =
    | { kind: 'cancel'; o: any }
    | { kind: 'photo'; o: any }
    | { kind: 'unsave'; s: any }
    | { kind: 'save'; o: any }
    | null;

// Text-style buttons and links get a comfortable 44px tap height on phones.
const textBtn =
    'inline-flex min-h-11 items-center text-sm font-semibold text-pw-rust hover:underline';

const goto = (data: Record<string, string>) =>
    router.get('/orders', data, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
    });

export default function Index({
    orders,
    view,
    counts,
    hasMore,
    nextLimit,
    stats: totals,
    last,
    saved = [],
    maxSaved = 20,
}: any) {
    const { auth }: any = usePage().props;
    const first = (auth?.user?.name ?? '').split(' ')[0];
    const everything = counts.ongoing + counts.finished;
    const [allSaved, setAllSaved] = useState(false);
    const [ask, setAsk] = useState<Ask>(null);
    const [saveName, setSaveName] = useState('');
    const [error, setError] = useState('');

    // Totals come from the server and cover ALL orders, so they never change with the tab.
    const stats = [
        ['Orders', totals.orders],
        ['In progress', totals.inProgress],
        ['Total spent', '₱' + Number(totals.spent).toLocaleString('en-PH', { maximumFractionDigits: 0 })],
    ];

    const tabs = [
        { key: 'ongoing', label: 'Ongoing', count: counts.ongoing },
        { key: 'finished', label: 'Finished', count: counts.finished },
    ];

    const ready = orders.filter((o: any) => o.status === 'Ready for Pickup');
    const claimed = orders.filter((o: any) => o.status === 'Completed');

    const post = (url: string, data: Record<string, any> = {}) =>
        router.post(url, data, {
            preserveScroll: true,
            onSuccess: () => setError(''),
            onError: (er) => setError(String(Object.values(er)[0])),
        });

    // Turn a past order into a named, reusable one (asks for the name in a small box).
    const saveOrder = (o: any) => {
        setSaveName(String(o.service?.name ?? '').slice(0, 40));
        setAsk({ kind: 'save', o });
    };

    const doSave = (o: any, name: string) => {
        const dropoff = o.fulfillment === 'dropoff';
        post('/saved-orders', {
            name,
            service_id: o.service_id,
            quantity: qtyOf(o),
            fulfillment: dropoff ? 'dropoff' : 'delivery',
            address: dropoff ? '' : (o.address ?? auth?.user?.address ?? ''),
            lat: dropoff ? '' : (o.lat ?? ''),
            lng: dropoff ? '' : (o.lng ?? ''),
            instructions: o.instructions ?? '',
        });
    };

    const confirmAsk = () => {
        if (!ask) return;
        const a = ask;
        setAsk(null);
        if (a.kind === 'cancel') post(`/orders/${a.o.id}/cancel`);
        if (a.kind === 'photo')
            router.delete(`/orders/${a.o.id}/photo`, { preserveScroll: true });
        if (a.kind === 'unsave')
            router.delete(`/saved-orders/${a.s.id}`, { preserveScroll: true });
        if (a.kind === 'save' && saveName.trim()) doSave(a.o, saveName.trim());
    };

    const card = (o: any) => {
        const steps = o.fulfillment === 'dropoff' ? pickupSteps : deliverySteps;
        return (
            <div
                key={o.id}
                className={`paper p-6 ${o.status === 'Ready for Pickup' ? 'ring-2 ring-pw-peach' : ''}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs tracking-[0.3em] text-pw-ink/70 uppercase">
                            Order tag
                        </p>
                        <p className="mt-1 font-sans text-3xl font-semibold tracking-tight tabular-nums">
                            {tag(o.id)}
                        </p>
                    </div>
                    <StatusBadge status={o.status} />
                </div>

                <p className="mt-4 text-sm font-semibold">{o.service.name}</p>
                <p className="text-sm text-pw-ink/70">
                    {Number(o.quantity)} {o.service.unit}
                    {o.estimated_quantity != null &&
                        Number(o.estimated_quantity) !== Number(o.quantity) && (
                            <> · weighed by the shop (you estimated {Number(o.estimated_quantity)})</>
                        )}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-pw-ink/70">
                    {o.fulfillment === 'dropoff' ? (
                        <Store aria-hidden="true" className="h-4 w-4 shrink-0" />
                    ) : (
                        <Truck aria-hidden="true" className="h-4 w-4 shrink-0" />
                    )}
                    <span>{o.fulfillment === 'dropoff'
                        ? 'You drop off & collect at the shop'
                        : `We pick up & deliver${o.distance_km != null ? ` · ${Number(o.distance_km).toFixed(1)} km` : ''}`}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <PaymentBadge order={o} />
                    {o.payment_method === 'gcash' &&
                        o.payment_status !== 'paid' && (
                            <Link
                                href={`/orders/${o.id}/pay`}
                                className={textBtn}
                            >
                                Pay now →
                            </Link>
                        )}
                    {o.payment_reference && o.payment_status === 'paid' && (
                        <span className="font-mono text-xs text-pw-ink/70">
                            {o.payment_reference}
                        </span>
                    )}
                </div>

                {o.status !== 'Cancelled' && (
                    <OrderTracker steps={steps} status={o.status} />
                )}
                {o.status === 'Pending' && o.payment_status !== 'paid' && (
                    <button
                        onClick={() => setAsk({ kind: 'cancel', o })}
                        className={`mt-2 ${textBtn}`}
                    >
                        Cancel order
                    </button>
                )}
                <details className="group mt-4 rounded-xl border border-pw-ink/15 px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-pw-ink/80 [&::-webkit-details-marker]:hidden">
                        <span>
                            <span className="group-open:hidden">Show order details</span>
                            <span className="hidden group-open:inline">Hide order details</span>
                        </span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pw-ink text-pw-cream">
                            <ChevronDown
                                aria-hidden="true"
                                className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
                            />
                        </span>
                    </summary>
                    <div className="mt-3 grid gap-2">
                {o.pickup_date && (
                    <p className="text-sm text-pw-ink/70">
                        Preferred {o.fulfillment === 'dropoff' ? 'drop-off' : 'pickup'}:{' '}
                        {day(o.pickup_date + 'T00:00:00')}
                        {o.pickup_slot ? ` · ${o.pickup_slot}` : ''}
                    </p>
                )}
                {o.fulfillment !== 'dropoff' && o.address && (
                    <p className="text-sm text-pw-ink/70">{o.address}</p>
                )}
                {o.created_at && (
                    <p className="text-sm text-pw-ink/70">
                        Placed{' '}
                        {new Date(o.created_at).toLocaleString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: 'Asia/Manila',
                        })}
                    </p>
                )}

                {o.instructions && (
                    <p className="text-sm text-pw-ink/70">
                        Note: {o.instructions}
                    </p>
                )}
                {o.intake && (
                    <div className="rounded-xl border border-pw-ink/15 bg-pw-ink/5 p-3 text-sm">
                        <p className="font-semibold">
                            Received at the shop: {o.intake.item_count}{' '}
                            {o.intake.item_count === 1 ? 'item' : 'items'}
                        </p>
                        {o.intake.notes && (
                            <p className="mt-0.5 text-pw-ink/70">
                                {o.intake.notes}
                            </p>
                        )}
                        {o.intake.photo_url && (
                            <a
                                href={o.intake.photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-block text-xs font-semibold text-pw-rust underline"
                            >
                                See the counter photo
                            </a>
                        )}
                    </div>
                )}
                {o.photo_url && (
                    <div className="flex items-end gap-3">
                        <img
                            src={o.photo_url}
                            alt="Your laundry"
                            className="h-24 rounded-xl border border-pw-ink/15 object-cover"
                        />
                        {o.status === 'Pending' && (
                            <button
                                onClick={() => setAsk({ kind: 'photo', o })}
                                className={textBtn}
                            >
                                Remove photo
                            </button>
                        )}
                    </div>
                )}
                    </div>
                </details>

                <div className="mt-5 flex items-end justify-between border-t border-dashed border-pw-ink/25 pt-4">
                    <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                        <button
                            onClick={() => saveOrder(o)}
                            className={textBtn}
                        >
                            Save for reuse
                        </button>
                        {o.status !== 'Cancelled' && (
                            <Link
                                href={`/orders/${o.id}/receipt`}
                                className={textBtn}
                            >
                                Receipt
                            </Link>
                        )}
                    </span>
                    <span className="text-right">
                        <span className="block font-serif text-2xl">
                            {peso(o.amount_due)}
                        </span>
                        {Number(o.delivery_fee) > 0 && (
                            <span className="block text-xs text-pw-ink/70">
                                incl. {peso(o.delivery_fee)} delivery
                            </span>
                        )}
                    </span>
                </div>
            </div>
        );
    };

    // One saved order. "compact" is the row inside the "Show all" window.
    const savedCard = (s: any, compact = false) => (
        <div
            key={s.id}
            className={
                compact
                    ? 'flex items-center justify-between gap-3 py-3'
                    : 'flex flex-col rounded-3xl bg-pw-cream p-5 text-pw-ink shadow-xl'
            }
        >
            <div className="min-w-0">
                <p
                    className={`truncate font-serif ${compact ? 'text-lg' : 'text-2xl'}`}
                >
                    {s.name}
                </p>
                <p className="text-sm text-pw-ink/70">
                    {s.service_name ?? 'Service removed'} · {s.quantity}{' '}
                    {s.unit}
                </p>
                {s.available ? (
                    s.price != null && (
                        <p className="text-sm text-pw-ink/70">
                            {peso(Number(s.price) * s.quantity)}
                        </p>
                    )
                ) : (
                    <p className="text-sm text-pw-rust">
                        That service isn't available. You can pick another one.
                    </p>
                )}
            </div>
            <div
                className={
                    compact
                        ? 'flex shrink-0 items-center gap-3'
                        : 'mt-auto flex items-center justify-between pt-4'
                }
            >
                <Link
                    href={`/orders/create?saved=${s.id}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-pw-ink px-5 text-sm font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink"
                >
                    Order this
                </Link>
                <button
                    onClick={() => {
                        if (compact) setAllSaved(false);
                        setAsk({ kind: 'unsave', s });
                    }}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-pw-ink/70 hover:text-pw-rust hover:underline"
                >
                    Remove
                </button>
            </div>
        </div>
    );

    return (
        <Shell>
            <Head title="My Orders" />
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                        Your laundry
                    </p>
                    <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                        My <span className="text-pw-peach italic">orders</span>
                    </h1>
                    {first && (
                        <p className="mt-3 text-pw-cream/60">
                            Hi {first}, here's where your laundry is.
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    {last && (
                        <Link
                            href={`/orders/create?service=${last.service_id}&quantity=${Math.max(1, Math.ceil(Number(last.quantity)))}`}
                            className="btn btn-ghost"
                        >
                            Reorder last
                        </Link>
                    )}
                    <Link
                        href="/orders/create"
                        className="btn btn-cream"
                    >
                        + New order
                    </Link>
                </div>
            </div>

            {error && (
                <p
                    role="alert"
                    className="mt-6 rounded-2xl bg-pw-peach px-4 py-3 text-sm font-semibold text-pw-ink"
                >
                    {error}
                </p>
            )}
            {counts.ready > 0 ? (
                <button
                    onClick={() => goto({ view: 'finished' })}
                    className="mt-8 inline-flex items-center gap-3 rounded-full bg-pw-peach px-5 py-2 text-sm font-semibold text-pw-ink transition hover:-translate-y-0.5"
                >
                    <span className="h-2 w-2 rounded-full bg-pw-ink" />
                    {counts.ready} order{counts.ready === 1 ? ' is' : 's are'}{' '}
                    ready to claim →
                </button>
            ) : null}

            {everything > 0 && (
                <p className="mt-6 flex flex-wrap gap-x-2 text-sm text-pw-cream/70">
                    {stats.map(([l, v], i) => (
                        <span key={l}>
                            {i > 0 && <span aria-hidden="true">· </span>}
                            <strong className="font-semibold text-pw-cream tabular-nums">
                                {v}
                            </strong>{' '}
                            {String(l).toLowerCase()}
                        </span>
                    ))}
                </p>
            )}

            {everything === 0 && (
                <div className="mt-10 rounded-3xl border border-dashed border-pw-cream/25 p-12 text-center">
                    <p className="font-serif text-3xl">
                        No orders{' '}
                        <span className="text-pw-peach italic">yet</span>
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-pw-cream/60">
                        Pick a service, enter your kilos, and we'll take it from
                        there.
                    </p>
                    <Link
                        href="/orders/create"
                        className="mt-6 inline-block rounded-full bg-pw-cream px-7 py-3 text-sm font-semibold text-pw-ink transition hover:-translate-y-0.5 hover:bg-pw-peach"
                    >
                        Place your first order
                    </Link>
                </div>
            )}

            {everything > 0 && (
                <OrderViewTabs url="/orders" tabs={tabs} current={view} />
            )}

            {everything > 0 && orders.length === 0 && (
                <p className="mt-6 rounded-3xl border border-dashed border-pw-cream/25 p-10 text-center text-pw-cream/60">
                    {view === 'ongoing'
                        ? 'Nothing in progress right now.'
                        : 'Nothing finished yet. Orders show up here once they are ready.'}
                </p>
            )}

            {view === 'ongoing' && orders.length > 0 && (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    {orders.map(card)}
                </div>
            )}

            {view === 'finished' && ready.length > 0 && (
                <div className="mt-6">
                    <p className="text-xs tracking-[0.3em] text-pw-peach uppercase">
                        Ready to claim · {counts.ready}
                    </p>
                    <div className="mt-4 grid gap-6 md:grid-cols-2">
                        {ready.map(card)}
                    </div>
                </div>
            )}

            {view === 'finished' && claimed.length > 0 && (
                <div className="mt-10">
                    <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                        Claimed log · {counts.claimed}
                    </p>
                    <div className="mt-4 divide-y divide-pw-ink/10 overflow-hidden rounded-3xl bg-pw-cream text-pw-ink shadow-xl">
                        {claimed.map((o: any) => (
                            <div
                                key={o.id}
                                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">
                                        <span className="font-serif text-lg">
                                            {tag(o.id)}
                                        </span>{' '}
                                        · {o.service.name}
                                    </p>
                                    <p className="text-xs text-pw-ink/70">
                                        {day(o.created_at)} ·{' '}
                                        {Number(o.quantity)} {o.service.unit} ·{' '}
                                        {peso(o.amount_due)} ·{' '}
                                        {o.payment_method === 'gcash'
                                            ? 'GCash'
                                            : 'Cash'}
                                    </p>
                                    {o.status === 'Cancelled' && o.cancel_reason && (
                                        <p className="mt-1 text-xs text-pw-rust">
                                            Cancelled: {o.cancel_reason}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <RateOrder order={o} />
                                    <Link
                                        href={`/orders/create?service=${o.service_id}&quantity=${qtyOf(o)}`}
                                        className={textBtn}
                                    >
                                        Order again
                                    </Link>
                                    <button
                                        onClick={() => saveOrder(o)}
                                        className="inline-flex min-h-11 items-center text-sm font-semibold text-pw-ink/70 hover:text-pw-rust hover:underline"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {saved.length > 0 && (
                <div className="mt-10">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                            Saved orders{' '}
                            <span className="text-pw-cream/65">
                                · {saved.length}/{maxSaved} · most recent first
                            </span>
                        </p>
                        {saved.length > SAVED_PREVIEW && (
                            <button
                                onClick={() => setAllSaved(true)}
                                className="rounded-full border border-pw-cream/25 px-4 py-1.5 text-xs font-semibold text-pw-cream transition hover:bg-pw-cream/10"
                            >
                                Show all ({saved.length})
                            </button>
                        )}
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {saved
                            .slice(0, SAVED_PREVIEW)
                            .map((s: any) => savedCard(s))}
                    </div>

                    <Dialog open={allSaved} onOpenChange={setAllSaved}>
                        <DialogContent className="max-w-lg border-pw-ink/10 bg-pw-cream text-pw-ink">
                            <DialogHeader>
                                <DialogTitle className="font-serif text-2xl">
                                    All saved orders
                                </DialogTitle>
                                <DialogDescription className="text-pw-ink/70">
                                    {saved.length} of {maxSaved} · most recently
                                    used first
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] divide-y divide-pw-ink/10 overflow-y-auto pr-1">
                                {saved.map((s: any) => savedCard(s, true))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            <Dialog open={!!ask} onOpenChange={(open) => !open && setAsk(null)}>
                <DialogContent className="max-w-md border-pw-ink/10 bg-pw-cream text-pw-ink">
                    {ask && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                confirmAsk();
                            }}
                            className="grid gap-5"
                        >
                            <DialogHeader>
                                <DialogTitle className="font-serif text-2xl">
                                    {ask.kind === 'cancel' &&
                                        `Cancel order ${tag(ask.o.id)}?`}
                                    {ask.kind === 'photo' && 'Remove this photo?'}
                                    {ask.kind === 'unsave' &&
                                        `Remove “${ask.s.name}”?`}
                                    {ask.kind === 'save' && 'Name this saved order'}
                                </DialogTitle>
                                <DialogDescription className="text-pw-ink/70">
                                    {ask.kind === 'cancel' &&
                                        'This cannot be undone.'}
                                    {ask.kind === 'photo' &&
                                        'The photo will be deleted from this order.'}
                                    {ask.kind === 'unsave' &&
                                        'It will be removed from your saved orders. Your past orders stay as they are.'}
                                    {ask.kind === 'save' &&
                                        'For example: Weekly wash. You can reuse it in one tap.'}
                                </DialogDescription>
                            </DialogHeader>
                            {ask.kind === 'save' && (
                                <div>
                                    <label
                                        htmlFor="save-name"
                                        className="text-sm font-medium text-pw-ink/80"
                                    >
                                        Name
                                    </label>
                                    <input
                                        id="save-name"
                                        autoFocus
                                        maxLength={40}
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        className="mt-1 w-full border-0 border-b border-pw-ink/30 bg-transparent px-0 py-2 text-base text-pw-ink outline-none focus:border-pw-ink"
                                    />
                                </div>
                            )}
                            <div className="flex flex-wrap justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAsk(null)}
                                    className="btn btn-outline"
                                >
                                    {ask.kind === 'save' ? 'Not now' : 'Keep it'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        ask.kind === 'save' && !saveName.trim()
                                    }
                                    className={
                                        ask.kind === 'save'
                                            ? 'btn btn-navy'
                                            : 'btn btn-danger'
                                    }
                                >
                                    {ask.kind === 'cancel' && 'Cancel order'}
                                    {ask.kind === 'photo' && 'Remove photo'}
                                    {ask.kind === 'unsave' && 'Remove'}
                                    {ask.kind === 'save' && 'Save'}
                                </button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            <LoadMore
                url="/orders"
                view={view}
                nextLimit={nextLimit}
                show={hasMore}
            />
        </Shell>
    );
}