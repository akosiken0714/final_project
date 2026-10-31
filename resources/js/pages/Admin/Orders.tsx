import { router, Head, Link } from '@inertiajs/react';
import { ChevronDown, MapPin, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
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

// True on phone-width screens (below 768px). The orders list is shown as cards there and as a table on bigger screens.
function useIsPhone() {
    const query = '(max-width: 767px)';
    const [phone, setPhone] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(query).matches,
    );

    useEffect(() => {
        const m = window.matchMedia(query);
        const on = () => setPhone(m.matches);
        on();
        m.addEventListener('change', on);
        return () => m.removeEventListener('change', on);
    }, []);

    return phone;
}

export default function Orders({
    orders,
    stats,
    view,
    counts,
    hasMore,
    nextLimit,
    analytics,
    search = '',
    filters = {},
    statuses = [],
    attention = null,
    can = { revenue: true, analytics: true, cancelPaid: true },
}: any) {
    // Staff (cashiers) never get the revenue card or the analytics: the server leaves them out too.
    const cards = [
        ['Total orders', stats.total],
        ['Pending', stats.pending],
        ['Ready', stats.ready],
        ['Awaiting GCash', stats.awaitingGcash],
        ...(can.revenue ? [['Revenue', '₱' + Number(stats.revenue).toFixed(0)]] : []),
    ];

    const tabs = [
        { key: 'ongoing', label: 'Ongoing', count: counts.ongoing },
        { key: 'finished', label: 'Finished', count: counts.finished },
        { key: 'cancelled', label: 'Cancelled', count: counts.cancelled ?? 0 },
    ];
    const hrs = (n: number) => (n % 24 === 0 && n > 0 ? `${n / 24}d` : `${n}h`);
    const alerts: { n: number; text: string; href?: string }[] = attention
        ? [
              {
                  n: attention.waiting,
                  text: `waiting to start for ${hrs(attention.waitingHours)}+`,
                  href: '/admin?status=Pending',
              },
              {
                  n: attention.readyOld,
                  text: `ready but not picked up for ${hrs(attention.readyHours)}+`,
                  href: '/admin?view=finished&status=Ready%20for%20Pickup',
              },
              { n: attention.pickupsToday, text: 'pickups scheduled today' },
          ].filter((a) => a.n > 0)
        : [];
    const hasFilter = Boolean(
        search ||
            filters.status ||
            filters.pay ||
            filters.from ||
            filters.to,
    );
    const field =
        'rounded-full border border-pw-cream/25 bg-transparent px-4 py-2 text-sm text-pw-cream scheme-dark';

    const ready = orders.filter((o: any) =>
        ['Ready for Pickup'].includes(o.status),
    );
    const claimed = orders.filter((o: any) => o.status === 'Completed');
    const finished = view === 'finished';
    const cols = finished ? 8 : 7;
    const isPhone = useIsPhone();
    const emptyText = hasFilter
        ? 'No orders match these filters.'
        : view === 'cancelled'
          ? 'No cancelled orders.'
          : finished
            ? 'Nothing finished yet. Orders show up here once they are ready.'
            : 'No ongoing orders right now.';
    const [showFilters, setShowFilters] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(
        typeof window !== 'undefined' && window.location.hash === '#analytics',
    );

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
                className="border-t border-pw-ink/10 align-top transition hover:bg-pw-ink/5"
            >
                <td className="px-4 py-4 font-serif text-lg">
                    {o.id}
                    <span className="block font-sans text-xs tracking-wide text-pw-ink/70">
                        {day(o.created_at)}
                    </span>
                    {o.status !== 'Cancelled' && (
                        <Link
                            href={`/orders/${o.id}/receipt`}
                            className="mt-1 block font-sans text-xs font-semibold tracking-wide text-pw-rust underline"
                        >
                            Receipt
                        </Link>
                    )}
                </td>
                <td className="px-4 py-4">
                    {o.user?.name ?? 'Deleted customer'}
                    <br />
                    <span className="text-pw-ink/70">{o.user?.phone}</span>
                    {o.source === 'walk_in' && (
                        <span className="mt-1 block w-fit rounded-full bg-pw-peach/30 px-2.5 py-0.5 text-xs font-semibold text-pw-rust-deep">
                            Walk-in
                        </span>
                    )}
                </td>
                <td className="px-4 py-4">
                    <span
                        className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap ${dropoff ? 'bg-pw-ink/10 text-pw-ink' : 'bg-pw-steel/25 text-pw-deep'}`}
                    >
                        {dropoff ? 'Drop-off at shop' : 'Pick up & deliver'}
                    </span>
                    {o.pickup_date && (
                        <span className="mt-1 block text-xs font-semibold text-pw-rust">
                            {dropoff ? 'Drop-off' : 'Pickup'}:{' '}
                            {new Date(o.pickup_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                            {o.pickup_slot ? ` · ${o.pickup_slot}` : ''}
                        </span>
                    )}
                    {!dropoff && (
                        <details className="group mt-1">
                            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-base font-semibold text-pw-rust md:min-h-0 md:text-xs [&::-webkit-details-marker]:hidden">
                                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                                Address &amp; map
                                <ChevronDown
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                                />
                            </summary>
                            <div className="mt-1">
                        {!dropoff && o.address && (
                            <span className="mt-1 block max-w-[200px] text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                                {o.address}
                            </span>
                        )}
                        {!dropoff && o.distance_km != null && (
                            <span className="block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                                {Number(o.distance_km).toFixed(1)} km · fee{' '}
                                {peso(o.delivery_fee)}
                            </span>
                        )}
                        {!dropoff && o.lat != null && o.lng != null && (
                            <a
                                href={mapLink(o.lat, o.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-pw-rust underline"
                            >
                                Open map
                            </a>
                        )}
                        {!dropoff && o.lat == null && (
                            <span className="block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                                No pin (older order)
                            </span>
                        )}
                            </div>
                        </details>
                    )}
                </td>
                <td className="px-4 py-4">
                    {o.service?.name ?? 'Removed service'}
                    <span className="block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                        {Number(o.quantity)} {o.service?.unit ?? ''}
                        {o.estimated_quantity != null &&
                            Number(o.estimated_quantity) !== Number(o.quantity) && (
                                <> · customer estimated {Number(o.estimated_quantity)}</>
                            )}
                    </span>
                    {o.status !== 'Cancelled' && o.status !== 'Completed' && (
                        <WeighForm o={o} />
                    )}
                    <IntakeBlock o={o} />
                    {o.photo_url && (
                        <a
                            href={o.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-xs font-semibold text-pw-rust underline"
                        >
                            View photo
                        </a>
                    )}
                </td>
                <td className="px-4 py-4">
                    {peso(o.amount_due)}
                    {Number(o.delivery_fee) > 0 && (
                        <span className="block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                            {peso(o.total)} + {peso(o.delivery_fee)} delivery
                        </span>
                    )}
                </td>
                <td className="px-4 py-4">
                    <PaymentBadge order={o} />
                    {o.payment_reference && (
                        <span className="mt-1 block font-mono text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                            {o.payment_reference}
                        </span>
                    )}
                    {o.payment_method === 'cash' &&
                        o.payment_status !== 'paid' && (
                            <button
                                onClick={() => markPaid(o)}
                                className="mt-1 block text-xs font-semibold text-pw-rust underline"
                            >
                                Mark paid
                            </button>
                        )}
                    {o.payment_method === 'gcash' &&
                        o.payment_status !== 'paid' && (
                            <span className="mt-1 block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                                waiting for customer
                            </span>
                        )}
                </td>
                <td className="px-4 py-4">
                    <StatusBadge status={o.status} />
                    {o.status !== 'Cancelled' && (
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
                        className="mt-2 block rounded-lg border border-pw-ink/20 bg-transparent p-1 text-xs transition outline-none focus:border-pw-ink focus:ring-2 focus:ring-pw-peach/30 disabled:opacity-50"
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
                    )}
                    {o.status !== 'Cancelled' &&
                        o.status !== 'Completed' &&
                        (o.payment_status !== 'paid' || can.cancelPaid ? (
                            <CancelForm o={o} />
                        ) : (
                            <span className="mt-2 block max-w-[180px] text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                                Paid order: only an admin can cancel it (a refund is needed).
                            </span>
                        ))}
                    {o.status === 'Cancelled' && o.cancel_reason && (
                        <span className="mt-1 block max-w-[180px] text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                            Reason: {o.cancel_reason}
                        </span>
                    )}
                </td>
                {finished && <td className="px-4 py-4">{action}</td>}
            </tr>
        );
    };

    const section = (title: string, note: string, n: number) => (
        <tr key={title} className="border-t border-pw-ink/10 bg-pw-ink/5">
            <td
                colSpan={cols}
                className="px-4 py-2 text-xs tracking-[0.18em] text-pw-ink/70 uppercase"
            >
                {title} <span className="text-pw-ink/70">· {n}</span>{' '}
                <span className="tracking-normal text-pw-ink/70 normal-case">
                    {note}
                </span>
            </td>
        </tr>
    );

    return (
        <Shell>
            <Head title="Admin Dashboard" />
            <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                {can.revenue ? 'Admin dashboard' : 'Staff desk'}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <h1 className="font-serif text-4xl md:text-5xl">
                    Command <span className="text-pw-peach italic">center</span>
                </h1>
                <Link
                    href="/admin/walk-in"
                    className="inline-flex min-h-11 items-center rounded-full bg-pw-peach px-6 py-2.5 text-sm font-semibold text-pw-navy transition hover:-translate-y-0.5 hover:bg-pw-cream"
                >
                    + Walk-in order
                </Link>
            </div>

            <div
                className={`mt-8 grid grid-cols-2 gap-4 ${can.revenue ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}
            >
                {cards.map(([label, val]) => (
                    <div
                        key={label}
                        className="rounded-3xl bg-pw-cream p-5 text-pw-ink shadow-lg ring-1 ring-pw-ink/5"
                    >
                        <p className="text-xs tracking-[0.18em] text-pw-ink/70 uppercase">
                            {label}
                        </p>
                        <p className="mt-1 font-serif text-3xl">{val}</p>
                    </div>
                ))}
            </div>

            {attention && (
                <div
                    className="mt-8 flex flex-wrap items-center gap-2"
                    aria-label="Needs attention"
                >
                    <span className="text-xs tracking-[0.18em] text-pw-sky uppercase">
                        Needs attention
                    </span>
                    {alerts.length === 0 ? (
                        <span className="rounded-full border border-pw-cream/20 px-4 py-1.5 text-sm text-pw-cream/70">
                            All clear. Nothing is waiting too long.
                        </span>
                    ) : (
                        alerts.map((a) => {
                            const cls =
                                'rounded-full bg-pw-peach px-4 py-1.5 text-sm font-semibold text-pw-ink';
                            const body = (
                                <>
                                    {a.n} {a.text}
                                </>
                            );
                            return a.href ? (
                                <Link
                                    key={a.text}
                                    href={a.href}
                                    className={`${cls} transition hover:bg-pw-cream`}
                                >
                                    {body}
                                </Link>
                            ) : (
                                <span key={a.text} className={cls}>
                                    {body}
                                </span>
                            );
                        })
                    )}
                </div>
            )}

            <form
                role="search"
                onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const params: Record<string, string> = { view };
                    ['q', 'status', 'pay', 'from', 'to'].forEach((k) => {
                        const v = String(fd.get(k) ?? '').trim();
                        if (v) params[k] = v;
                    });
                    router.get('/admin', params, {
                        preserveScroll: true,
                        preserveState: true,
                        replace: true,
                    });
                }}
                className="mt-8 flex flex-wrap items-center gap-3 rounded-3xl border border-pw-cream/10 bg-pw-cream/5 p-4"
            >
                <input
                    key={search}
                    name="q"
                    type="search"
                    defaultValue={search}
                    aria-label="Search orders"
                    placeholder="Search order # or customer name, email, phone"
                    className={`w-full lg:w-80 ${field} placeholder:text-pw-cream/65`}
                />
                <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    aria-expanded={Boolean(showFilters || hasFilter)}
                    className="inline-flex items-center gap-2 rounded-full border border-pw-cream/25 px-5 py-2 text-sm font-semibold text-pw-cream transition hover:bg-pw-cream/10"
                >
                    <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                    {showFilters || hasFilter ? 'Hide filters' : 'Filters'}
                    <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 transition-transform duration-200 ${showFilters || hasFilter ? 'rotate-180' : ''}`}
                    />
                </button>
                <div
                    className={`${showFilters || hasFilter ? 'flex' : 'hidden'} w-full flex-wrap items-center gap-3 border-t border-pw-cream/10 pt-4`}
                >
                <select
                    key={`s-${filters.status}`}
                    name="status"
                    defaultValue={filters.status ?? ''}
                    aria-label="Filter by status"
                    className={field}
                >
                    <option value="">Any status</option>
                    {[...statuses, 'Cancelled'].map((st: string) => (
                        <option key={st} value={st}>
                            {st}
                        </option>
                    ))}
                </select>
                <select
                    key={`p-${filters.pay}`}
                    name="pay"
                    defaultValue={filters.pay ?? ''}
                    aria-label="Filter by payment"
                    className={field}
                >
                    <option value="">Paid or unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                </select>
                <label className="flex items-center gap-2 text-xs text-pw-cream/60">
                    From
                    <input
                        key={`f-${filters.from}`}
                        name="from"
                        type="date"
                        defaultValue={filters.from ?? ''}
                        className={field}
                    />
                </label>
                <label className="flex items-center gap-2 text-xs text-pw-cream/60">
                    To
                    <input
                        key={`t-${filters.to}`}
                        name="to"
                        type="date"
                        defaultValue={filters.to ?? ''}
                        className={field}
                    />
                </label>
                </div>
                <button
                    type="submit"
                    className="rounded-full bg-pw-cream px-5 py-2 text-sm font-semibold text-pw-ink"
                >
                    Apply
                </button>
                {hasFilter && (
                    <button
                        type="button"
                        onClick={() =>
                            router.get(
                                '/admin',
                                { view },
                                {
                                    preserveScroll: true,
                                    preserveState: false,
                                    replace: true,
                                },
                            )
                        }
                        className="rounded-full border border-pw-cream/25 px-5 py-2 text-sm font-semibold text-pw-cream transition hover:bg-pw-cream/10"
                    >
                        Clear
                    </button>
                )}
            </form>
            <OrderViewTabs url="/admin" tabs={tabs} current={view} />

            {isPhone ? (
                <div className="mt-6 space-y-4">
                    {orders.length === 0 && (
                        <p className="rounded-3xl bg-pw-cream px-5 py-10 text-center text-base text-pw-ink/80">
                            {emptyText}
                        </p>
                    )}

                    {!finished &&
                        orders.map((o: any) => (
                            <PhoneOrderCard
                                key={o.id}
                                o={o}
                                can={can}
                                onPaid={markPaid}
                            />
                        ))}

                    {finished && ready.length > 0 && (
                        <p className="px-1 pt-2 text-sm tracking-[0.12em] text-pw-cream/85 uppercase">
                            Ready to claim · {counts.ready}{' '}
                            <span className="tracking-normal normal-case">
                                waiting for the customer
                            </span>
                        </p>
                    )}
                    {finished &&
                        ready.map((o: any) => (
                            <PhoneOrderCard
                                key={o.id}
                                o={o}
                                can={can}
                                onPaid={markPaid}
                                action={
                                    <button
                                        type="button"
                                        onClick={() => claim(o)}
                                        className="min-h-12 w-full rounded-full bg-pw-ink px-5 text-base font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink"
                                    >
                                        Mark claimed
                                    </button>
                                }
                            />
                        ))}

                    {finished && claimed.length > 0 && (
                        <p className="px-1 pt-2 text-sm tracking-[0.12em] text-pw-cream/85 uppercase">
                            Claimed log · {counts.claimed}{' '}
                            <span className="tracking-normal normal-case">
                                picked up or delivered
                            </span>
                        </p>
                    )}
                    {finished &&
                        claimed.map((o: any) => (
                            <PhoneOrderCard
                                key={o.id}
                                o={o}
                                can={can}
                                onPaid={markPaid}
                            />
                        ))}
                </div>
            ) : (
            <div className="mt-6 overflow-x-auto rounded-3xl bg-pw-cream text-pw-ink shadow-xl ring-1 ring-pw-ink/5">
                <table className="w-full text-left text-sm">
                    <thead className="text-xs tracking-[0.2em] text-pw-ink/70 uppercase">
                        <tr>
                            <th className="px-4 py-4">#</th>
                            <th className="px-4 py-4">Customer</th>
                            <th className="px-4 py-4">Handover</th>
                            <th className="px-4 py-4">Service</th>
                            <th className="px-4 py-4">Total</th>
                            <th className="px-4 py-4">Payment</th>
                            <th className="px-4 py-4">Status</th>
                            {finished && <th className="px-4 py-4"></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 && (
                            <tr>
                                <td
                                    colSpan={cols}
                                    className="px-4 py-10 text-center text-pw-ink/70"
                                >
                                    {hasFilter
                                        ? 'No orders match these filters.'
                                        : view === 'cancelled'
                                          ? 'No cancelled orders.'
                                          : finished
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
                                        className="rounded-full bg-pw-ink px-4 py-1.5 text-xs font-semibold whitespace-nowrap text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink"
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
            )}

            <LoadMore
                url="/admin"
                view={view}
                nextLimit={nextLimit}
                show={hasMore}
            />

            {can.analytics && (
            <section id="analytics" className="mt-16 border-t border-pw-cream/10 pt-12">
                <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                    Shop analytics
                </p>
                <h2 className="mt-2 font-serif text-3xl md:text-4xl">
                    How the shop is{' '}
                    <span className="text-pw-peach italic">doing</span>
                </h2>
                {showAnalytics ? (
                    <AnalyticsPanel {...analytics} view={view} />
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowAnalytics(true)}
                        className="btn btn-ghost mt-6"
                    >
                        <TrendingUp aria-hidden="true" className="h-4 w-4" />
                        Show shop analytics
                        <ChevronDown aria-hidden="true" className="h-4 w-4" />
                    </button>
                )}
            </section>
            )}
        </Shell>
    );
}

// One order as a phone card: the key facts big and clear, the everyday actions as large buttons,
// and the rest (address, weighing, receiving laundry, cancelling) tucked under "More".
function PhoneOrderCard({
    o,
    can,
    onPaid,
    action = null,
}: {
    o: any;
    can: any;
    onPaid: (o: any) => void;
    action?: ReactNode;
}) {
    const dropoff = o.fulfillment === 'dropoff';
    const open = o.status !== 'Cancelled' && o.status !== 'Completed';
    const options = dropoff
        ? ['Pending', 'In Progress', 'Ready for Pickup', 'Completed']
        : ['Pending', 'In Progress', 'Out for Delivery', 'Completed'];
    const label =
        'text-xs font-semibold tracking-[0.12em] text-pw-ink/75 uppercase';

    const changeStatus = (next: string) => {
        if (next === o.status) return;
        if (!confirm(`Change order #${o.id} from "${o.status}" to "${next}"?`))
            return;
        router.patch(
            `/admin/orders/${o.id}`,
            { status: next },
            {
                preserveScroll: true,
                onError: (er) => alert(Object.values(er)[0]),
            },
        );
    };

    return (
        <article className="rounded-3xl bg-pw-cream p-5 text-pw-ink shadow-lg ring-1 ring-pw-ink/5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-serif text-3xl leading-none">#{o.id}</p>
                    <p className="mt-1.5 text-sm text-pw-ink/80">
                        {day(o.created_at)}
                    </p>
                </div>
                <StatusBadge status={o.status} />
            </div>

            <div className="mt-4">
                <p className="text-lg font-semibold">
                    {o.user?.name ?? 'Deleted customer'}
                </p>
                {o.user?.phone && (
                    <a
                        href={`tel:${o.user.phone}`}
                        className="text-base text-pw-ink/80 underline"
                    >
                        {o.user.phone}
                    </a>
                )}
                {o.source === 'walk_in' && (
                    <span className="mt-2 block w-fit rounded-full bg-pw-peach/30 px-3 py-1 text-sm font-semibold text-pw-rust-deep">
                        Walk-in
                    </span>
                )}
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-pw-ink/10 pt-4">
                <div>
                    <p className="font-serif text-3xl">{peso(o.amount_due)}</p>
                    {Number(o.delivery_fee) > 0 && (
                        <p className="text-sm text-pw-ink/80">
                            incl. {peso(o.delivery_fee)} delivery
                        </p>
                    )}
                </div>
                <PaymentBadge order={o} />
            </div>
            {o.payment_reference && (
                <p className="mt-2 font-mono text-sm text-pw-ink/80">
                    {o.payment_reference}
                </p>
            )}
            {o.payment_method === 'gcash' && o.payment_status !== 'paid' && (
                <p className="mt-2 text-sm text-pw-ink/80">
                    Waiting for the customer to pay with GCash.
                </p>
            )}

            <div className="mt-4 space-y-1.5 border-t border-pw-ink/10 pt-4">
                <p className="text-base font-semibold">
                    {o.service?.name ?? 'Removed service'}
                </p>
                <p className="text-base text-pw-ink/80">
                    {Number(o.quantity)} {o.service?.unit ?? ''}
                    {o.estimated_quantity != null &&
                        Number(o.estimated_quantity) !== Number(o.quantity) && (
                            <> · customer estimated {Number(o.estimated_quantity)}</>
                        )}
                </p>
                <p className="pt-1">
                    <span
                        className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${dropoff ? 'bg-pw-ink/10 text-pw-ink' : 'bg-pw-steel/25 text-pw-deep'}`}
                    >
                        {dropoff ? 'Drop-off at shop' : 'Pick up & deliver'}
                    </span>
                </p>
                {o.pickup_date && (
                    <p className="text-base font-semibold text-pw-rust">
                        {dropoff ? 'Drop-off' : 'Pickup'}:{' '}
                        {new Date(o.pickup_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        {o.pickup_slot ? ` · ${o.pickup_slot}` : ''}
                    </p>
                )}
            </div>

            {open && (
                <div className="mt-5 space-y-3">
                    <label htmlFor={`st-${o.id}`} className={`block ${label}`}>
                        Move order to
                    </label>
                    <select
                        id={`st-${o.id}`}
                        value={o.status}
                        onChange={(e) => changeStatus(e.target.value)}
                        className="block min-h-12 w-full rounded-xl border border-pw-ink/30 bg-white px-3 text-base text-pw-ink outline-none focus:border-pw-ink focus:ring-2 focus:ring-pw-peach/40"
                    >
                        {options.map((st) => (
                            <option key={st} value={st}>
                                {st}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {o.payment_method === 'cash' && o.payment_status !== 'paid' && (
                <button
                    type="button"
                    onClick={() => onPaid(o)}
                    className="mt-3 min-h-12 w-full rounded-full bg-pw-ink px-5 text-base font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink"
                >
                    Mark cash paid
                </button>
            )}

            {action && <div className="mt-3">{action}</div>}

            {o.status === 'Cancelled' && o.cancel_reason && (
                <p className="mt-4 rounded-xl bg-pw-ink/5 px-3 py-2 text-base text-pw-ink/80">
                    Reason: {o.cancel_reason}
                </p>
            )}

            <details className="group mt-4 border-t border-pw-ink/10 pt-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-base font-semibold text-pw-rust [&::-webkit-details-marker]:hidden">
                    More details and actions
                    <ChevronDown
                        aria-hidden="true"
                        className="h-5 w-5 transition-transform duration-200 group-open:rotate-180"
                    />
                </summary>
                <div className="space-y-4 pt-2 text-base">
                    {!dropoff && (
                        <div>
                            <p className={label}>Delivery</p>
                            {o.address && (
                                <p className="mt-1">{o.address}</p>
                            )}
                            {o.distance_km != null && (
                                <p className="text-pw-ink/80">
                                    {Number(o.distance_km).toFixed(1)} km · fee{' '}
                                    {peso(o.delivery_fee)}
                                </p>
                            )}
                            {o.lat != null && o.lng != null && (
                                <a
                                    href={mapLink(o.lat, o.lng)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-block py-1 font-semibold text-pw-rust underline"
                                >
                                    Open map
                                </a>
                            )}
                            {o.lat == null && (
                                <p className="text-pw-ink/80">
                                    No pin (older order)
                                </p>
                            )}
                        </div>
                    )}

                    {o.status !== 'Cancelled' && (
                        <Link
                            href={`/orders/${o.id}/receipt`}
                            className="block py-1 font-semibold text-pw-rust underline"
                        >
                            Open receipt
                        </Link>
                    )}
                    {o.photo_url && (
                        <a
                            href={o.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block py-1 font-semibold text-pw-rust underline"
                        >
                            View photo
                        </a>
                    )}

                    {open && <WeighForm o={o} />}
                    <IntakeBlock o={o} />

                    {open &&
                        (o.payment_status !== 'paid' || can.cancelPaid ? (
                            <CancelForm o={o} />
                        ) : (
                            <p className="text-pw-ink/80">
                                Paid order: only an admin can cancel it (a refund is needed).
                            </p>
                        ))}
                </div>
            </details>
        </article>
    );
}

const smallInput =
    'mt-1 w-full rounded-lg border border-pw-ink/25 bg-white px-2 py-2 text-sm text-pw-ink outline-none focus:border-pw-ink';

// "Weigh & confirm": staff type the real weight. The price per unit stays the same, only the amount changes.
function WeighForm({ o }: { o: any }) {
    const [value, setValue] = useState(String(Number(o.quantity)));
    const [busy, setBusy] = useState(false);
    const paid = o.payment_status === 'paid';
    const oldQty = Number(o.quantity);
    const unitPrice = oldQty > 0 ? Number(o.total) / oldQty : 0;
    const typed = Number(value);
    const valid = value.trim() !== '' && Number.isFinite(typed) && typed >= 0.1 && typed <= 200;
    const preview = valid ? Math.round(unitPrice * typed * 100) / 100 : null;

    const save = () => {
        if (!valid || preview === null) return;
        if (
            !confirm(
                `Confirm order #${o.id} at ${typed} ${o.service?.unit ?? ''}?\nLaundry price becomes ${peso(preview)} (was ${peso(o.total)}). The customer will be notified.`,
            )
        )
            return;
        setBusy(true);
        router.patch(
            `/admin/orders/${o.id}/weigh`,
            { quantity: typed },
            {
                preserveScroll: true,
                onError: (er) => alert(Object.values(er)[0]),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <details className="group mt-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-base font-semibold text-pw-rust md:min-h-0 md:text-xs [&::-webkit-details-marker]:hidden">
                Weigh &amp; confirm
                <ChevronDown
                    aria-hidden="true"
                    className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                />
            </summary>
            <div className="mt-1 w-full max-w-sm md:w-44">
                {paid ? (
                    <p className="text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                        Already paid, so the price can't change. Weigh orders before recording payment.
                    </p>
                ) : (
                    <>
                        <label htmlFor={`w-${o.id}`} className="text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                            Real amount ({o.service?.unit ?? 'units'})
                        </label>
                        <input
                            id={`w-${o.id}`}
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0.1"
                            max="200"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className={smallInput}
                        />
                        <p className="mt-1 text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                            {preview !== null
                                ? `New laundry price: ${peso(preview)}`
                                : 'Enter 0.1 to 200'}
                        </p>
                        <button
                            type="button"
                            onClick={save}
                            disabled={!valid || busy}
                            className="mt-2 min-h-11 rounded-full bg-pw-ink px-5 py-2 text-sm font-semibold text-pw-cream md:min-h-0 md:px-4 md:text-xs transition hover:bg-pw-peach hover:text-pw-ink disabled:opacity-50"
                        >
                            {busy ? 'Saving…' : 'Save weight'}
                        </button>
                    </>
                )}
            </div>
        </details>
    );
}

// Admin cancel: a short reason is required, because the customer is told why.
function CancelForm({ o }: { o: any }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const valid = reason.trim().length >= 3;

    const cancel = () => {
        if (!valid) return;
        const paidNote =
            o.payment_status === 'paid'
                ? `\nThis order is already PAID (${peso(o.amount_due)}). You must refund it by hand.`
                : '';
        if (
            !confirm(
                `Cancel order #${o.id}? The customer will be told: "${reason.trim()}". This can't be undone.${paidNote}`,
            )
        )
            return;
        setBusy(true);
        router.post(
            `/admin/orders/${o.id}/cancel`,
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onError: (er) => alert(Object.values(er)[0]),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <details className="group mt-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-base font-semibold text-red-700 md:min-h-0 md:text-xs [&::-webkit-details-marker]:hidden">
                Cancel order
                <ChevronDown
                    aria-hidden="true"
                    className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                />
            </summary>
            <div className="mt-1 w-full max-w-sm md:w-44">
                <label htmlFor={`c-${o.id}`} className="text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                    Reason (customer sees it) <span className="font-semibold text-red-600">*</span>
                </label>
                <input
                    id={`c-${o.id}`}
                    maxLength={200}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Customer asked to cancel"
                    className={smallInput}
                />
                <button
                    type="button"
                    onClick={cancel}
                    disabled={!valid || busy}
                    className="mt-2 rounded-full bg-red-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
                >
                    {busy ? 'Cancelling…' : 'Cancel this order'}
                </button>
            </div>
        </details>
    );
}

// "Receive laundry": staff count the items and note their condition when the bag is handed over.
// This is the record that settles "my shirt is missing / damaged" disputes. The customer can see it too.
function IntakeBlock({ o }: { o: any }) {
    const done = o.status === 'Completed' || o.status === 'Cancelled';
    const intake = o.intake ?? null;

    if (done) {
        return intake ? (
            <span className="mt-1 block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                Received: {intake.item_count} {intake.item_count === 1 ? 'item' : 'items'}
                {intake.photo_url && (
                    <>
                        {' · '}
                        <a
                            href={intake.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-pw-rust underline"
                        >
                            counter photo
                        </a>
                    </>
                )}
            </span>
        ) : null;
    }

    return <IntakeForm o={o} intake={intake} />;
}

function IntakeForm({ o, intake }: { o: any; intake: any }) {
    const [count, setCount] = useState(intake ? String(intake.item_count) : '');
    const [notes, setNotes] = useState(intake?.notes ?? '');
    const [photo, setPhoto] = useState<File | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [busy, setBusy] = useState(false);
    const n = Number(count);
    const valid = count.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= 500;

    const save = () => {
        if (!valid) return;
        setBusy(true);
        router.post(
            `/admin/orders/${o.id}/intake`,
            {
                item_count: n,
                notes: notes.trim(),
                ...(photo ? { photo } : {}),
                remove_photo: removePhoto && !photo ? 1 : 0,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setPhoto(null);
                    setRemovePhoto(false);
                },
                onError: (er) => alert(Object.values(er)[0]),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <details className="group mt-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-base font-semibold text-pw-rust md:min-h-0 md:text-xs [&::-webkit-details-marker]:hidden">
                {intake
                    ? `Received: ${intake.item_count} ${intake.item_count === 1 ? 'item' : 'items'} (edit)`
                    : 'Receive laundry'}
                <ChevronDown
                    aria-hidden="true"
                    className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                />
            </summary>
            <div className="mt-1 w-52">
                <label htmlFor={`ic-${o.id}`} className="text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                    Number of items <span className="font-semibold text-red-600">*</span>
                </label>
                <input
                    id={`ic-${o.id}`}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="500"
                    step="1"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className={smallInput}
                />
                <label htmlFor={`in-${o.id}`} className="mt-2 block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                    Condition notes (the customer can read these)
                </label>
                <textarea
                    id={`in-${o.id}`}
                    rows={2}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 1 white shirt, small stain on the collar"
                    className={smallInput}
                />
                <label htmlFor={`ip-${o.id}`} className="mt-2 block text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                    Counter photo (optional)
                </label>
                <input
                    id={`ip-${o.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-xs text-pw-ink"
                />
                {intake?.photo_url && (
                    <div className="mt-1 text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                        <a
                            href={intake.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-pw-rust underline"
                        >
                            View current photo
                        </a>
                        <label className="ml-2 inline-flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={removePhoto}
                                onChange={(e) => setRemovePhoto(e.target.checked)}
                            />
                            remove it
                        </label>
                    </div>
                )}
                {intake?.received_by_name && (
                    <p className="mt-1 text-sm text-pw-ink/80 md:text-xs md:text-pw-ink/70">
                        First recorded by {intake.received_by_name}.
                    </p>
                )}
                <button
                    type="button"
                    onClick={save}
                    disabled={!valid || busy}
                    className="mt-2 min-h-11 rounded-full bg-pw-ink px-5 py-2 text-sm font-semibold text-pw-cream md:min-h-0 md:px-4 md:text-xs transition hover:bg-pw-peach hover:text-pw-navy disabled:opacity-50"
                >
                    {busy ? 'Saving…' : intake ? 'Update record' : 'Save record'}
                </button>
            </div>
        </details>
    );
}
