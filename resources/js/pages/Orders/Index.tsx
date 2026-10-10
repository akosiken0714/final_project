import { Link, Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import PaymentBadge from '@/components/PaymentBadge';
import Shell from '@/components/Shell';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/StatusBadge';
import { LoadMore, OrderViewTabs } from '@/components/OrderViewTabs';

const pickupSteps = ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'];
const deliverySteps = ['Pending', 'In Progress', 'Out for Delivery', 'Completed'];
const day = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const tag = (id: number) => '#' + String(id).padStart(4, '0');
const qtyOf = (o: any) => Math.max(1, Math.ceil(Number(o.quantity)));
const peso = (n: number | string) => '₱' + Number(n).toFixed(2);
const SAVED_PREVIEW = 3;

const goto = (data: Record<string, string>) => router.get('/orders', data, { preserveScroll: true, preserveState: true, replace: true });

export default function Index({ orders, view, counts, hasMore, nextLimit, stats: totals, last, saved = [], maxSaved = 20 }: any) {
    const { auth }: any = usePage().props;
    const first = (auth?.user?.name ?? '').split(' ')[0];
    const everything = counts.ongoing + counts.finished;
    const [allSaved, setAllSaved] = useState(false);

    // Totals come from the server and cover ALL orders, so they never change with the tab.
    const stats = [
        ['Orders', totals.orders],
        ['In progress', totals.inProgress],
        ['Total spent', '₱' + Number(totals.spent).toFixed(0)],
    ];

    const tabs = [
        { key: 'ongoing', label: 'Ongoing', count: counts.ongoing },
        { key: 'finished', label: 'Finished', count: counts.finished },
    ];

    const ready = orders.filter((o: any) => o.status === 'Ready for Pickup');
    const claimed = orders.filter((o: any) => o.status === 'Completed');

    const post = (url: string, data: Record<string, any> = {}) =>
        router.post(url, data, { preserveScroll: true, onError: (er) => alert(Object.values(er)[0]) });

    // Turn a past order into a named, reusable one.
    const saveOrder = (o: any) => {
        const name = prompt('Name this saved order (for example: Weekly wash)', String(o.service?.name ?? '').slice(0, 40));
        if (!name || !name.trim()) return;
        const dropoff = o.fulfillment === 'dropoff';
        post('/saved-orders', {
            name: name.trim(),
            service_id: o.service_id,
            quantity: qtyOf(o),
            fulfillment: dropoff ? 'dropoff' : 'delivery',
            address: dropoff ? '' : o.address ?? auth?.user?.address ?? '',
            lat: dropoff ? '' : o.lat ?? '',
            lng: dropoff ? '' : o.lng ?? '',
            instructions: o.instructions ?? '',
        });
    };

    const card = (o: any) => {
        const steps = o.fulfillment === 'dropoff' ? pickupSteps : deliverySteps;
        const step = steps.indexOf(o.status);
        return (
            <div key={o.id} className={`rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl ${o.status === 'Ready for Pickup' ? 'ring-2 ring-[#F0A98B]' : ''}`}>
                <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-[#0F1E2B]/60">Order tag</p>
                        <p className="mt-1 font-serif text-3xl">{tag(o.id)}</p>
                    </div>
                    <StatusBadge status={o.status} />
                </div>

                <p className="mt-4 text-sm font-semibold">{o.service.name}</p>
                <p className="text-sm text-[#0F1E2B]/70">{Number(o.quantity)} {o.service.unit}</p>
                <p className="mt-1 text-sm text-[#0F1E2B]/70">
                    {o.fulfillment === 'dropoff'
                        ? 'You drop off & collect at the shop'
                        : `We pick up & deliver${o.distance_km != null ? ` · ${Number(o.distance_km).toFixed(1)} km` : ''}`}
                </p>
                {o.fulfillment !== 'dropoff' && o.address && <p className="text-sm text-[#0F1E2B]/70">{o.address}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <PaymentBadge order={o} />
                    {o.payment_method === 'gcash' && o.payment_status !== 'paid' && (
                        <Link href={`/orders/${o.id}/pay`} className="text-xs font-semibold uppercase tracking-widest text-[#C96F48] hover:underline">
                            Pay now →
                        </Link>
                    )}
                    {o.payment_reference && o.payment_status === 'paid' && (
                        <span className="font-mono text-[11px] text-[#0F1E2B]/50">{o.payment_reference}</span>
                    )}
                </div>

                <div className="mt-5 flex gap-1.5">
                    {steps.map((s, idx) => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-700 ${idx <= step ? 'bg-[#F0A98B]' : 'bg-[#0F1E2B]/15'}`} />
                    ))}
                </div>

                {o.instructions && <p className="mt-4 text-sm text-[#0F1E2B]/70">Note: {o.instructions}</p>}
                {o.photo_url && (
                    <div className="mt-4 flex items-end gap-3">
                        <img src={o.photo_url} alt="Your laundry" className="h-24 rounded-xl border border-[#0F1E2B]/15 object-cover" />
                        {o.status === 'Pending' && (
                            <button
                                onClick={() => confirm('Remove this photo?') && router.delete(`/orders/${o.id}/photo`, { preserveScroll: true })}
                                className="text-xs font-semibold uppercase tracking-widest text-[#C96F48] hover:underline"
                            >
                                Remove photo
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-5 flex items-end justify-between border-t border-dashed border-[#0F1E2B]/25 pt-4">
                    <button onClick={() => saveOrder(o)} className="text-xs font-semibold uppercase tracking-widest text-[#C96F48] hover:underline">
                        Save for reuse
                    </button>
                    <span className="text-right">
                        <span className="block font-serif text-2xl">{peso(o.amount_due)}</span>
                        {Number(o.delivery_fee) > 0 && (
                            <span className="block text-[11px] text-[#0F1E2B]/50">incl. {peso(o.delivery_fee)} delivery</span>
                        )}
                    </span>
                </div>
            </div>
        );
    };

    // One saved order. "compact" is the row inside the "Show all" window.
    const savedCard = (s: any, compact = false) => (
        <div key={s.id} className={compact ? 'flex items-center justify-between gap-3 py-3' : 'flex flex-col rounded-3xl bg-[#F7F1E8] p-5 text-[#0F1E2B] shadow-xl'}>
            <div className="min-w-0">
                <p className={`truncate font-serif ${compact ? 'text-lg' : 'text-2xl'}`}>{s.name}</p>
                <p className="text-sm text-[#0F1E2B]/70">
                    {s.service_name ?? 'Service removed'} · {s.quantity} {s.unit}
                </p>
                {s.available ? (
                    s.price != null && <p className="text-sm text-[#0F1E2B]/50">{peso(Number(s.price) * s.quantity)}</p>
                ) : (
                    <p className="text-sm text-[#C96F48]">That service isn't available. You can pick another one.</p>
                )}
            </div>
            <div className={compact ? 'flex shrink-0 items-center gap-3' : 'mt-auto flex items-center justify-between pt-4'}>
                <Link href={`/orders/create?saved=${s.id}`} className="rounded-full bg-[#0F1E2B] px-4 py-1.5 text-xs font-semibold text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B]">
                    Order this
                </Link>
                <button
                    onClick={() => confirm(`Remove "${s.name}" from your saved orders?`) && router.delete(`/saved-orders/${s.id}`, { preserveScroll: true })}
                    className="text-xs font-semibold uppercase tracking-widest text-[#0F1E2B]/50 hover:text-[#C96F48] hover:underline"
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
                    <p className=" text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Your laundry</p>
                    <h1 className=" mt-3 font-serif text-5xl md:text-6xl">
                        My <span className="italic text-[#F0A98B]">orders</span>
                    </h1>
                    {first && <p className=" mt-3 text-[#F7F1E8]/60">Hi {first}, here's where your laundry is.</p>}
                </div>
                <div className=" flex flex-wrap gap-3">
                    {last && (
                        <Link
                            href={`/orders/create?service=${last.service_id}&quantity=${Math.max(1, Math.ceil(Number(last.quantity)))}`}
                            className="rounded-full border border-[#F7F1E8]/25 px-6 py-3 text-sm font-semibold text-[#F7F1E8] transition hover:-translate-y-0.5 hover:bg-[#F7F1E8]/10"
                        >
                            Reorder last
                        </Link>
                    )}
                    <Link href="/orders/create" className="rounded-full bg-[#F7F1E8] px-6 py-3 text-sm font-semibold text-[#0F1E2B] transition hover:-translate-y-0.5 hover:bg-[#F0A98B]">
                        + New order
                    </Link>
                </div>
            </div>

            {counts.ready > 0 ? (
                <button
                    onClick={() => goto({ view: 'finished' })}
                    className=" mt-8 inline-flex items-center gap-3 rounded-full bg-[#F0A98B] px-5 py-2 text-sm font-semibold text-[#0F1E2B] transition hover:-translate-y-0.5"
                >
                    <span className="h-2 w-2 rounded-full bg-[#0F1E2B]" />
                    {counts.ready} order{counts.ready === 1 ? ' is' : 's are'} ready to claim →
                </button>
            ) : (
                counts.ongoing > 0 && (
                    <div className=" mt-8 inline-flex items-center gap-3 rounded-full bg-[#F0A98B] px-5 py-2 text-sm font-semibold text-[#0F1E2B]">
                        <span className="h-2 w-2 rounded-full bg-[#0F1E2B]" />
                        {counts.ongoing} order{counts.ongoing === 1 ? '' : 's'} in progress
                    </div>
                )
            )}

            {everything > 0 && (
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {stats.map(([l, v]) => (
                        <div key={l} className=" rounded-3xl bg-[#F7F1E8] p-5 text-[#0F1E2B] shadow-xl">
                            <div className="mb-3 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                            <p className="text-xs uppercase tracking-[0.2em] text-[#0F1E2B]/60">{l}</p>
                            <p className="mt-1 font-serif text-4xl">{v}</p>
                        </div>
                    ))}
                </div>
            )}

            {saved.length > 0 && (
                <div className="mt-10">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">
                            Saved orders <span className="text-[#F7F1E8]/45">· {saved.length}/{maxSaved} · most recent first</span>
                        </p>
                        {saved.length > SAVED_PREVIEW && (
                            <button onClick={() => setAllSaved(true)} className="rounded-full border border-[#F7F1E8]/25 px-4 py-1.5 text-xs font-semibold text-[#F7F1E8] transition hover:bg-[#F7F1E8]/10">
                                Show all ({saved.length})
                            </button>
                        )}
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{saved.slice(0, SAVED_PREVIEW).map((s: any) => savedCard(s))}</div>

                    <Dialog open={allSaved} onOpenChange={setAllSaved}>
                        <DialogContent className="max-w-lg border-[#0F1E2B]/10 bg-[#F7F1E8] text-[#0F1E2B]">
                            <DialogHeader>
                                <DialogTitle className="font-serif text-2xl">All saved orders</DialogTitle>
                                <DialogDescription className="text-[#0F1E2B]/60">{saved.length} of {maxSaved} · most recently used first</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[60vh] divide-y divide-[#0F1E2B]/10 overflow-y-auto pr-1">{saved.map((s: any) => savedCard(s, true))}</div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {everything === 0 && (
                <div className="mt-10 rounded-3xl border border-dashed border-[#F7F1E8]/25 p-12 text-center">
                    <p className="font-serif text-3xl">No orders <span className="italic text-[#F0A98B]">yet</span></p>
                    <p className="mx-auto mt-2 max-w-sm text-[#F7F1E8]/60">Pick a service, enter your kilos, and we'll take it from there.</p>
                    <Link href="/orders/create" className="mt-6 inline-block rounded-full bg-[#F7F1E8] px-7 py-3 text-sm font-semibold text-[#0F1E2B] transition hover:-translate-y-0.5 hover:bg-[#F0A98B]">
                        Place your first order
                    </Link>
                </div>
            )}

            {everything > 0 && <OrderViewTabs url="/orders" tabs={tabs} current={view} />}

            {everything > 0 && orders.length === 0 && (
                <p className="mt-6 rounded-3xl border border-dashed border-[#F7F1E8]/25 p-10 text-center text-[#F7F1E8]/60">
                    {view === 'ongoing' ? 'Nothing in progress right now.' : 'Nothing finished yet. Orders show up here once they are ready.'}
                </p>
            )}

            {view === 'ongoing' && orders.length > 0 && <div className="mt-6 grid gap-6 md:grid-cols-2">{orders.map(card)}</div>}

            {view === 'finished' && ready.length > 0 && (
                <div className="mt-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#F0A98B]">Ready to claim · {counts.ready}</p>
                    <div className="mt-4 grid gap-6 md:grid-cols-2">{ready.map(card)}</div>
                </div>
            )}

            {view === 'finished' && claimed.length > 0 && (
                <div className="mt-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Claimed log · {counts.claimed}</p>
                    <div className="mt-4 divide-y divide-[#0F1E2B]/10 overflow-hidden rounded-3xl bg-[#F7F1E8] text-[#0F1E2B] shadow-xl">
                        {claimed.map((o: any) => (
                            <div key={o.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">
                                        <span className="font-serif text-lg">{tag(o.id)}</span> · {o.service.name}
                                    </p>
                                    <p className="text-xs text-[#0F1E2B]/55">
                                        {day(o.created_at)} · {Number(o.quantity)} {o.service.unit} · {peso(o.amount_due)} · {o.payment_method === 'gcash' ? 'GCash' : 'Cash'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Link
                                        href={`/orders/create?service=${o.service_id}&quantity=${qtyOf(o)}`}
                                        className="text-xs font-semibold uppercase tracking-widest text-[#C96F48] hover:underline"
                                    >
                                        Order again
                                    </Link>
                                    <button onClick={() => saveOrder(o)} className="text-xs font-semibold uppercase tracking-widest text-[#0F1E2B]/55 hover:text-[#C96F48] hover:underline">
                                        Save
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <LoadMore url="/orders" view={view} nextLimit={nextLimit} show={hasMore} />
        </Shell>
    );
}
