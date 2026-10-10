import { router, Head } from '@inertiajs/react';
import { ReactNode } from 'react';
import PaymentBadge from '@/components/PaymentBadge';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import Shell from '@/components/Shell';
import StatusBadge from '@/components/StatusBadge';
import { LoadMore, OrderViewTabs } from '@/components/OrderViewTabs';
import { mapLink, peso } from '@/lib/delivery';

const day = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

export default function Orders({
    orders,
    stats,
    view,
    counts,
    hasMore,
    nextLimit,
    analytics,
}: any) {
    const cards = [
        ['Total orders', stats.total],
        ['Pending', stats.pending],
        ['Ready', stats.ready],
        ['Awaiting GCash', stats.awaitingGcash],
        ['Revenue', '₱' + Number(stats.revenue).toFixed(0)],
    ];

    const tabs = [
        { key: 'ongoing', label: 'Ongoing', count: counts.ongoing },
        { key: 'finished', label: 'Finished', count: counts.finished },
    ];

    const ready = orders.filter((o: any) =>
        ['Ready for Pickup'].includes(o.status),
    );
    const claimed = orders.filter((o: any) => o.status === 'Completed');
    const finished = view === 'finished';
    const cols = finished ? 10 : 9;

    const claim = (o: any) => {
        if (
            !confirm(
                `Mark order #${o.id} as claimed? Claimed orders move to the log and can't be reopened.`,
            )
        )
            return;
        router.patch(
            `/admin/orders/${o.id}`,
            { status: 'Completed' },
            {
                preserveScroll: true,
                onError: (er) => alert(Object.values(er)[0]),
            },
        );
    };

    const markPaid = (o: any) => {
        if (
            !confirm(
                `Record cash payment of ${peso(o.amount_due)} for order #${o.id}?`,
            )
        )
            return;
        router.patch(
            `/admin/orders/${o.id}/paid`,
            {},
            {
                preserveScroll: true,
                onError: (er) => alert(Object.values(er)[0]),
            },
        );
    };

    const row = (o: any, action: ReactNode = null) => {
        const dropoff = o.fulfillment === 'dropoff';

        return (
            <tr
                key={o.id}
                className="border-t border-[#0F1E2B]/10 align-top transition hover:bg-[#0F1E2B]/5"
            >
                <td className="px-4 py-3 font-serif text-lg">
                    {o.id}
                    <span className="block font-sans text-[10px] tracking-wide text-[#0F1E2B]/45">
                        {day(o.created_at)}
                    </span>
                </td>
                <td className="px-4 py-3">
                    {o.user?.name ?? 'Deleted customer'}
                    <br />
                    <span className="text-[#0F1E2B]/50">{o.user?.phone}</span>
                </td>
                <td className="px-4 py-3">
                    <span
                        className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap ${dropoff ? 'bg-[#0F1E2B]/10 text-[#0F1E2B]' : 'bg-[#5C8CA8]/25 text-[#1f4a63]'}`}
                    >
                        {dropoff ? 'Drop-off at shop' : 'Pick up & deliver'}
                    </span>
                    {!dropoff && o.address && (
                        <span className="mt-1 block max-w-[200px] text-xs text-[#0F1E2B]/60">
                            {o.address}
                        </span>
                    )}
                    {!dropoff && o.distance_km != null && (
                        <span className="block text-xs text-[#0F1E2B]/50">
                            {Number(o.distance_km).toFixed(1)} km · fee{' '}
                            {peso(o.delivery_fee)}
                        </span>
                    )}
                    {!dropoff && o.lat != null && o.lng != null && (
                        <a
                            href={mapLink(o.lat, o.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#C96F48] underline"
                        >
                            Open map
                        </a>
                    )}
                    {!dropoff && o.lat == null && (
                        <span className="block text-xs text-[#0F1E2B]/40">
                            No pin (older order)
                        </span>
                    )}
                </td>
                <td className="px-4 py-3">
                    {o.service?.name ?? 'Removed service'}
                </td>
                <td className="px-4 py-3">{o.quantity}</td>
                <td className="px-4 py-3">
                    {peso(o.amount_due)}
                    {Number(o.delivery_fee) > 0 && (
                        <span className="block text-[10px] text-[#0F1E2B]/45">
                            {peso(o.total)} + {peso(o.delivery_fee)} delivery
                        </span>
                    )}
                </td>
                <td className="px-4 py-3">
                    <PaymentBadge order={o} />
                    {o.payment_reference && (
                        <span className="mt-1 block font-mono text-[10px] text-[#0F1E2B]/50">
                            {o.payment_reference}
                        </span>
                    )}
                    {o.payment_method === 'cash' &&
                        o.payment_status !== 'paid' && (
                            <button
                                onClick={() => markPaid(o)}
                                className="mt-1 block text-xs font-semibold text-[#C96F48] underline"
                            >
                                Mark paid
                            </button>
                        )}
                    {o.payment_method === 'gcash' &&
                        o.payment_status !== 'paid' && (
                            <span className="mt-1 block text-[10px] text-[#0F1E2B]/45">
                                waiting for customer
                            </span>
                        )}
                </td>
                <td className="px-4 py-3">
                    {o.photo_url ? (
                        <a
                            href={o.photo_url}
                            target="_blank"
                            className="text-[#C96F48] underline"
                        >
                            view
                        </a>
                    ) : (
                        '-'
                    )}
                </td>
                <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                    <select
                        value={o.status}
                        disabled={o.status === 'Completed'}
                        onChange={(e) => {
                            const next = e.target.value;
                            if (next === o.status) return;
                            if (
                                !confirm(
                                    `Change order #${o.id} from "${o.status}" to "${next}"?`,
                                )
                            )
                                return;
                            router.patch(
                                `/admin/orders/${o.id}`,
                                { status: next },
                                {
                                    preserveScroll: true,
                                    onError: (er) =>
                                        alert(Object.values(er)[0]),
                                },
                            );
                        }}
                        className="mt-2 block rounded-lg border border-[#0F1E2B]/20 bg-transparent p-1 text-xs transition outline-none focus:border-[#0F1E2B] focus:ring-2 focus:ring-[#F0A98B]/30 disabled:opacity-50"
                    >
                        {(o.fulfillment === 'dropoff'
                            ? [
                                  'Pending',
                                  'In Progress',
                                  'Ready for Pickup',
                                  'Completed',
                              ]
                            : [
                                  'Pending',
                                  'In Progress',
                                  'Out for Delivery',
                                  'Completed',
                              ]
                        ).map((s: string) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </td>
                {finished && <td className="px-4 py-3">{action}</td>}
            </tr>
        );
    };

    const section = (title: string, note: string, n: number) => (
        <tr key={title} className="border-t border-[#0F1E2B]/10 bg-[#0F1E2B]/5">
            <td
                colSpan={cols}
                className="px-4 py-2 text-[10px] tracking-[0.25em] text-[#0F1E2B]/60 uppercase"
            >
                {title} <span className="text-[#0F1E2B]/40">· {n}</span>{' '}
                <span className="tracking-normal text-[#0F1E2B]/40 normal-case">
                    {note}
                </span>
            </td>
        </tr>
    );

    return (
        <Shell>
            <Head title="Admin Dashboard" />
            <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                Admin dashboard
            </p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl">
                Command <span className="text-[#F0A98B] italic">center</span>
            </h1>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
                {cards.map(([label, val]) => (
                    <div
                        key={label}
                        className="rounded-3xl bg-[#F7F1E8] p-5 text-[#0F1E2B] shadow-xl ring-1 ring-[#0F1E2B]/5 transition hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                        <div className="mb-3 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                        <p className="text-[10px] tracking-[0.25em] text-[#0F1E2B]/55 uppercase">
                            {label}
                        </p>
                        <p className="mt-1 font-serif text-4xl">{val}</p>
                    </div>
                ))}
            </div>

            <OrderViewTabs url="/admin" tabs={tabs} current={view} />

            <div className="mt-6 overflow-x-auto rounded-3xl bg-[#F7F1E8] text-[#0F1E2B] shadow-xl ring-1 ring-[#0F1E2B]/5">
                <table className="w-full text-left text-sm">
                    <thead className="text-[10px] tracking-[0.2em] text-[#0F1E2B]/55 uppercase">
                        <tr>
                            <th className="px-4 py-4">#</th>
                            <th className="px-4 py-4">Customer</th>
                            <th className="px-4 py-4">Handover</th>
                            <th className="px-4 py-4">Service</th>
                            <th className="px-4 py-4">Qty</th>
                            <th className="px-4 py-4">Total</th>
                            <th className="px-4 py-4">Payment</th>
                            <th className="px-4 py-4">Photo</th>
                            <th className="px-4 py-4">Status</th>
                            {finished && <th className="px-4 py-4"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 && (
                            <tr>
                                <td
                                    colSpan={cols}
                                    className="px-4 py-10 text-center text-[#0F1E2B]/55"
                                >
                                    {finished
                                        ? 'Nothing finished yet. Orders show up here once they are ready.'
                                        : 'No ongoing orders right now.'}
                                </td>
                            </tr>
                        )}

                        {!finished && orders.map((o: any) => row(o))}

                        {finished &&
                            ready.length > 0 &&
                            section(
                                'Ready to claim',
                                'waiting for the customer',
                                counts.ready,
                            )}
                        {finished &&
                            ready.map((o: any) =>
                                row(
                                    o,
                                    <button
                                        onClick={() => claim(o)}
                                        className="rounded-full bg-[#0F1E2B] px-4 py-1.5 text-xs font-semibold whitespace-nowrap text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B]"
                                    >
                                        Mark claimed
                                    </button>,
                                ),
                            )}

                        {finished &&
                            claimed.length > 0 &&
                            section(
                                'Claimed log',
                                'picked up or delivered',
                                counts.claimed,
                            )}
                        {finished && claimed.map((o: any) => row(o))}
                    </tbody>
                </table>
            </div>

            <LoadMore
                url="/admin"
                view={view}
                nextLimit={nextLimit}
                show={hasMore}
            />

            <section id="analytics" className="mt-16">
                <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                    Shop analytics
                </p>
                <h2 className="mt-2 font-serif text-3xl md:text-4xl">
                    How the shop is{' '}
                    <span className="text-[#F0A98B] italic">doing</span>
                </h2>
                <AnalyticsPanel {...analytics} view={view} />
            </section>
        </Shell>
    );
}
