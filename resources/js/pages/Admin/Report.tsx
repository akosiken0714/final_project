import { Head, Link } from '@inertiajs/react';
import { ReactNode } from 'react';
import { Stars } from '@/components/RateOrder';
import Shell from '@/components/Shell';

type Advice = { level: 'good' | 'watch' | 'action'; title: string; detail: string };
type Comment = { order: number; stars: number; comment: string; name: string; at: string };

type Props = {
    period: string;
    periods: Record<string, string>;
    periodLabel: string;
    from: string;
    to: string;
    generatedAt: string;
    preparedBy: string;
    shop: { name: string; address: string };
    headline: string;
    summary: {
        orders: number;
        ordersDelta: number | null;
        completed: number;
        completionRate: number | null;
        sales: number;
        salesDelta: number | null;
        average: number;
        averageDelta: number | null;
        rating: number | null;
        ratingDelta: number | null;
        ratingCount: number;
    };
    money: {
        sales: number;
        deliveryFees: number;
        billed: number;
        received: { cash: number; gcash: number; total: number; count: number };
        unpaid: { count: number; amount: number };
    };
    trend: {
        unit: 'day' | 'week';
        points: { date: string; orders: number; sales: number }[];
    };
    pipeline: { status: string; count: number }[];
    fulfillment: { label: string; count: number; percent: number }[];
    paymentMethods: { label: string; count: number; percent: number }[];
    speed: {
        avgHours: number | null;
        sample: number;
        oldestPendingHours: number | null;
    };
    stuck: {
        hours: number;
        count: number;
        list: { id: number; status: string; hours: number }[];
    };
    services: {
        name: string;
        unit: string;
        orders: number;
        quantity: number;
        sales: number;
        share: number;
    }[];
    customers: {
        total: number;
        new: number;
        returning: number;
        repeatRate: number | null;
        top: { name: string; orders: number; spent: number }[];
    };
    weekdays: { day: string; orders: number }[];
    peak: { day: string | null; hour: string | null };
    ratings: {
        ready: boolean;
        count: number;
        average: number | null;
        responseRate: number | null;
        distribution: { stars: number; count: number }[];
        needsAttention: Comment[];
        praise: Comment[];
    };
    advice: { good: Advice[]; improve: Advice[] };
};

const peso = (n: number) =>
    '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const ymd = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
const shortDay = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
    });
const stamp = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
const duration = (h: number) =>
    h < 1
        ? `${Math.round(h * 60)} min`
        : h < 48
          ? `${h.toFixed(1)} hrs`
          : `${(h / 24).toFixed(1)} days`;
const tag = (id: number) => '#' + String(id).padStart(4, '0');

// Everything below is drawn for paper first: dark text on white, and every colour
// is backed by words or numbers, so it also reads well when printed in black and white.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; }
  div[class*="min-h-screen"] { background: #fff !important; min-height: 0 !important; }
  nav, .fixed, .pw-noprint { display: none !important; }
  #main { padding-bottom: 0 !important; }
  main { padding: 0 !important; max-width: none !important; }
}
.pw-report, .pw-report * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

function Section({
    n,
    title,
    intro,
    children,
}: {
    n: number;
    title: string;
    intro?: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-10 break-inside-avoid print:mt-7">
            <h2 className="flex items-baseline gap-3 border-b border-pw-ink/15 pb-2 font-serif text-2xl">
                <span className="font-sans text-sm font-semibold text-pw-rust">
                    {n}
                </span>
                {title}
            </h2>
            {intro && (
                <p className="mt-2 text-sm text-pw-ink/70">{intro}</p>
            )}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Change({
    value,
    unit = '%',
    flat = 'same as before',
}: {
    value: number | null;
    unit?: string;
    flat?: string;
}) {
    if (value === null)
        return <span className="text-xs text-pw-ink/70">nothing earlier to compare</span>;
    if (value === 0) return <span className="text-xs text-pw-ink/70">{flat}</span>;
    const up = value > 0;
    return (
        <span
            className={`text-xs font-semibold ${up ? 'text-pw-ok' : 'text-pw-danger'}`}
        >
            {up ? '▲ up ' : '▼ down '}
            {Math.abs(value)}
            {unit} vs. the period before
        </span>
    );
}

function Tile({
    label,
    value,
    hint,
    change,
}: {
    label: string;
    value: ReactNode;
    hint: string;
    change?: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-pw-ink/15 bg-pw-cream/60 p-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                {label}
            </p>
            <p className="mt-1 font-serif text-4xl leading-tight">{value}</p>
            <p className="mt-1 text-xs text-pw-ink/70">{hint}</p>
            {change && <p className="mt-1">{change}</p>}
        </div>
    );
}

function Bar({ pct, color = '#F0A98B' }: { pct: number; color?: string }) {
    return (
        <div className="h-2.5 w-full rounded-full bg-pw-ink/10">
            <div
                className="h-full rounded-full"
                style={{
                    width: `${Math.max(0, Math.min(100, pct))}%`,
                    background: color,
                }}
            />
        </div>
    );
}

function Row({
    label,
    value,
    note,
    strong = false,
}: {
    label: string;
    value: string;
    note?: string;
    strong?: boolean;
}) {
    return (
        <div
            className={`flex items-baseline justify-between gap-4 py-2 ${strong ? 'font-semibold' : ''}`}
        >
            <div>
                <p>{label}</p>
                {note && (
                    <p className="text-xs font-normal text-pw-ink/70">
                        {note}
                    </p>
                )}
            </div>
            <p className="font-serif text-xl whitespace-nowrap">{value}</p>
        </div>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="py-3 text-sm text-pw-ink/70">{children}</p>;
}

function Trend({ trend }: { trend: Props['trend'] }) {
    const pts = trend.points;
    const max = Math.max(1, ...pts.map((p) => p.sales));
    const best = pts.reduce((a, b) => (b.sales > a.sales ? b : a), pts[0]);
    const label = (d: string) =>
        trend.unit === 'week' ? `week of ${shortDay(d)}` : shortDay(d);

    if (!best || best.sales === 0)
        return <Empty>No finished orders in this period yet, so there is nothing to chart.</Empty>;

    return (
        <div>
            <div
                className="flex h-36 items-end gap-[2px] border-b border-pw-ink/25"
                role="img"
                aria-label={`Bar chart of sales for each ${trend.unit}`}
            >
                {pts.map((p) => (
                    <div
                        key={p.date}
                        title={`${label(p.date)}: ${peso(p.sales)} from finished orders, ${p.orders} placed`}
                        className="flex-1 rounded-t-sm bg-pw-peach"
                        style={{
                            height:
                                p.sales > 0
                                    ? `${Math.max(3, (p.sales / max) * 100)}%`
                                    : '2px',
                            opacity: p.sales > 0 ? 1 : 0.4,
                        }}
                    />
                ))}
            </div>
            <div className="mt-1 flex justify-between text-xs text-pw-ink/70">
                <span>{shortDay(pts[0].date)}</span>
                <span>{shortDay(pts[pts.length - 1].date)}</span>
            </div>
            <p className="mt-2 text-sm">
                Each bar is one {trend.unit}. Your best {trend.unit} was{' '}
                <strong>{label(best.date)}</strong> with{' '}
                <strong>{peso(best.sales)}</strong>.
            </p>
        </div>
    );
}

function Quote({ c }: { c: Comment }) {
    return (
        <li className="break-inside-avoid rounded-xl border border-pw-ink/15 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
                <Stars value={c.stars} className="text-sm" />
                <span className="text-xs text-pw-ink/70">
                    {c.name} · order {tag(c.order)}
                </span>
            </div>
            <p className="mt-1.5">“{c.comment}”</p>
        </li>
    );
}

function AdviceList({
    items,
    empty,
}: {
    items: Advice[];
    empty: string;
}) {
    if (items.length === 0) return <Empty>{empty}</Empty>;
    const badge = (l: Advice['level']) =>
        l === 'action'
            ? { text: 'Do this first', cls: 'bg-pw-danger text-white' }
            : l === 'watch'
              ? { text: 'Keep an eye on', cls: 'bg-pw-peach text-pw-ink' }
              : { text: 'Going well', cls: 'bg-pw-ok text-white' };
    return (
        <ul className="space-y-3">
            {items.map((a) => {
                const b = badge(a.level);
                return (
                    <li
                        key={a.title}
                        className="break-inside-avoid rounded-xl border border-pw-ink/15 p-3"
                    >
                        <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase ${b.cls}`}
                        >
                            {b.text}
                        </span>
                        <p className="mt-1.5 font-semibold">{a.title}</p>
                        <p className="text-sm text-pw-ink/75">{a.detail}</p>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Report(p: Props) {
    const { summary: s, money, ratings: r, customers: c } = p;
    const hasOrders = s.orders > 0;
    const maxDay = Math.max(1, ...p.weekdays.map((d) => d.orders));
    const title = `${p.shop.name} report ${p.from} to ${p.to}`;

    return (
        <Shell>
            <Head title={title} />
            <style>{PRINT_CSS}</style>

            {/* Controls: shown on screen only, never printed */}
            <div className="pw-noprint">
                <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                    Admin
                </p>
                <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                    Business <span className="text-pw-peach italic">report</span>
                </h1>
                <p className="mt-3 max-w-xl text-pw-cream/60">
                    A clear summary of how the shop is doing. Pick a period, then
                    print it or save it as a PDF.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                    {Object.entries(p.periods).map(([key, label]) => (
                        <Link
                            key={key}
                            href={`/admin/report?period=${key}`}
                            preserveScroll
                            className={`rounded-full border px-4 py-1.5 text-sm transition ${key === p.period ? 'border-pw-peach bg-pw-peach font-semibold text-pw-ink' : 'border-pw-cream/30 text-pw-cream hover:border-pw-peach'}`}
                        >
                            {label}
                        </Link>
                    ))}
                    <button
                        onClick={() => window.print()}
                        className="ml-auto rounded-full bg-pw-cream px-5 py-1.5 text-sm font-semibold text-pw-ink transition hover:bg-pw-peach"
                    >
                        Print / Save as PDF
                    </button>
                </div>
                <p className="mt-2 text-xs text-pw-cream/65">
                    Tip: in the print window, choose “Save as PDF” as the
                    printer to keep a copy.
                </p>
            </div>

            <article className="pw-report mx-auto mt-8 max-w-[820px] rounded-3xl bg-white p-8 text-pw-ink shadow-xl print:mt-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
                {/* Header */}
                <header className="border-b-2 border-pw-ink pb-5">
                    <p className="text-xs font-semibold tracking-[0.3em] text-pw-rust uppercase">
                        Business report
                    </p>
                    <h2 className="mt-1 font-serif text-4xl">{p.shop.name}</h2>
                    <p className="mt-1 text-sm text-pw-ink/70">
                        {p.shop.address}
                    </p>
                    <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                        <div className="flex gap-2">
                            <dt className="text-pw-ink/70">Period:</dt>
                            <dd className="font-semibold">
                                {p.periodLabel} ({ymd(p.from)} – {ymd(p.to)})
                            </dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="text-pw-ink/70">Prepared by:</dt>
                            <dd className="font-semibold">{p.preparedBy}</dd>
                        </div>
                        <div className="flex gap-2 sm:col-span-2">
                            <dt className="text-pw-ink/70">Printed:</dt>
                            <dd>{stamp(p.generatedAt)} (Philippine time)</dd>
                        </div>
                    </dl>
                </header>

                {/* 1. The short version */}
                <Section n={1} title="The short version">
                    <p className="text-lg leading-snug">{p.headline}</p>
                    {hasOrders && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <Tile
                                label="Sales"
                                value={peso(s.sales)}
                                hint="Laundry price of finished orders"
                                change={<Change value={s.salesDelta} />}
                            />
                            <Tile
                                label="Orders received"
                                value={s.orders}
                                hint={`${s.completed} finished${s.completionRate !== null ? ` (${s.completionRate}%)` : ''}`}
                                change={<Change value={s.ordersDelta} />}
                            />
                            <Tile
                                label="Average order"
                                value={peso(s.average)}
                                hint="Typical amount for one order"
                                change={<Change value={s.averageDelta} />}
                            />
                            <Tile
                                label="Customer rating"
                                value={
                                    s.rating !== null ? (
                                        <>
                                            {s.rating.toFixed(1)}
                                            <span className="text-lg text-pw-ink/70">
                                                {' '}
                                                / 5
                                            </span>
                                        </>
                                    ) : (
                                        '—'
                                    )
                                }
                                hint={
                                    s.ratingCount > 0
                                        ? `from ${s.ratingCount} ${s.ratingCount === 1 ? 'rating' : 'ratings'}`
                                        : 'no ratings yet'
                                }
                                change={
                                    s.ratingDelta !== null ? (
                                        <Change
                                            value={s.ratingDelta}
                                            unit=" stars"
                                        />
                                    ) : undefined
                                }
                            />
                        </div>
                    )}
                </Section>

                {/* 2. What to do next */}
                <Section
                    n={2}
                    title="What to do next"
                    intro="Plain advice based on the numbers in this report. Start with anything marked “Do this first”."
                >
                    <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2">
                        <div>
                            <h3 className="mb-2 text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                Needs attention
                            </h3>
                            <AdviceList
                                items={p.advice.improve}
                                empty="Nothing needs attention right now. Nice work."
                            />
                        </div>
                        <div>
                            <h3 className="mb-2 text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                Going well
                            </h3>
                            <AdviceList
                                items={p.advice.good}
                                empty="Nothing stands out yet. More orders will make this clearer."
                            />
                        </div>
                    </div>
                </Section>

                {/* 3. Sales over time */}
                <Section
                    n={3}
                    title="Sales over time"
                    intro="Money earned from finished orders, grouped by the day (or week) the order was placed."
                >
                    <Trend trend={p.trend} />
                </Section>

                {/* 4. Money */}
                <Section
                    n={4}
                    title="Money"
                    intro="“Sales” is what the laundry itself earned. “Received” is the cash and GCash that actually came in during these dates."
                >
                    <div className="divide-y divide-pw-ink/10 rounded-2xl border border-pw-ink/15 px-4">
                        <Row
                            label="Laundry sales"
                            value={peso(money.sales)}
                            note="Finished orders only. This matches “Revenue” on the dashboard."
                        />
                        <Row
                            label="Delivery fees"
                            value={peso(money.deliveryFees)}
                            note="Charged on finished delivery orders."
                        />
                        <Row
                            label="Total billed to customers"
                            value={peso(money.billed)}
                            strong
                        />
                    </div>
                    <div className="mt-3 divide-y divide-pw-ink/10 rounded-2xl border border-pw-ink/15 px-4">
                        <Row
                            label="Money received"
                            value={peso(money.received.total)}
                            note={`Cash ${peso(money.received.cash)} · GCash ${peso(money.received.gcash)} · ${money.received.count} ${money.received.count === 1 ? 'payment' : 'payments'}`}
                            strong
                        />
                        <Row
                            label="Still waiting to be paid"
                            value={peso(money.unpaid.amount)}
                            note={
                                money.unpaid.count > 0
                                    ? `${money.unpaid.count} ${money.unpaid.count === 1 ? 'order' : 'orders'} placed in this period not paid yet.`
                                    : 'Every order in this period is paid.'
                            }
                        />
                    </div>
                </Section>

                {/* 5. Orders and speed */}
                <Section
                    n={5}
                    title="Orders and speed"
                    intro="Where this period's orders are right now, and how quickly the shop gets laundry ready."
                >
                    {!hasOrders ? (
                        <Empty>No orders in this period.</Empty>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {p.pipeline.map((x) => (
                                    <div
                                        key={x.status}
                                        className="rounded-xl border border-pw-ink/15 p-3 text-center"
                                    >
                                        <p className="font-serif text-3xl">
                                            {x.count}
                                        </p>
                                        <p className="text-xs text-pw-ink/70">
                                            {x.status}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-pw-ink/15 p-4">
                                    <p className="text-xs text-pw-ink/70">
                                        Average time until laundry is ready
                                    </p>
                                    <p className="font-serif text-3xl">
                                        {p.speed.avgHours !== null
                                            ? duration(p.speed.avgHours)
                                            : '—'}
                                    </p>
                                    <p className="text-xs text-pw-ink/70">
                                        {p.speed.sample > 0
                                            ? `Based on ${p.speed.sample} ${p.speed.sample === 1 ? 'order' : 'orders'}.`
                                            : 'Shows up once orders are marked ready.'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-pw-ink/15 p-4">
                                    <p className="text-xs text-pw-ink/70">
                                        Longest a new order has been waiting
                                    </p>
                                    <p className="font-serif text-3xl">
                                        {p.speed.oldestPendingHours !== null
                                            ? duration(p.speed.oldestPendingHours)
                                            : 'None waiting'}
                                    </p>
                                    <p className="text-xs text-pw-ink/70">
                                        Right now, across all orders.
                                    </p>
                                </div>
                            </div>

                            {p.stuck.count > 0 && (
                                <div className="mt-4 rounded-xl border border-pw-danger/50 bg-pw-danger/5 p-4 text-sm">
                                    <p className="font-semibold text-pw-danger">
                                        {p.stuck.count}{' '}
                                        {p.stuck.count === 1
                                            ? 'order has'
                                            : 'orders have'}{' '}
                                        not moved in {p.stuck.hours}+ hours
                                    </p>
                                    <ul className="mt-1 list-disc pl-5 text-pw-ink/80">
                                        {p.stuck.list.map((o) => (
                                            <li key={o.id}>
                                                {tag(o.id)} · {o.status} · no
                                                update for {o.hours} hours
                                            </li>
                                        ))}
                                    </ul>
                                    {p.stuck.count > p.stuck.list.length && (
                                        <p className="mt-1 text-xs text-pw-ink/70">
                                            …and{' '}
                                            {p.stuck.count - p.stuck.list.length}{' '}
                                            more.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 grid gap-5 sm:grid-cols-2">
                                <div>
                                    <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                        How laundry gets to customers
                                    </p>
                                    {p.fulfillment.map((x) => (
                                        <div key={x.label} className="mb-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>{x.label}</span>
                                                <span className="font-semibold">
                                                    {x.count} ({x.percent}%)
                                                </span>
                                            </div>
                                            <Bar pct={x.percent} color="#5C8CA8" />
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                        How customers choose to pay
                                    </p>
                                    {p.paymentMethods.map((x) => (
                                        <div key={x.label} className="mb-2 text-sm">
                                            <div className="flex justify-between">
                                                <span>{x.label}</span>
                                                <span className="font-semibold">
                                                    {x.count} ({x.percent}%)
                                                </span>
                                            </div>
                                            <Bar pct={x.percent} color="#5C8CA8" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </Section>

                {/* 6. Services */}
                <Section
                    n={6}
                    title="What customers ordered"
                    intro="Your services, from most to least ordered."
                >
                    {p.services.length === 0 ? (
                        <Empty>No orders in this period.</Empty>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs tracking-[0.15em] text-pw-ink/70 uppercase">
                                    <tr>
                                        <th className="py-2 pr-3">Service</th>
                                        <th className="px-3 py-2 text-right">Orders</th>
                                        <th className="px-3 py-2 text-right">Amount washed</th>
                                        <th className="px-3 py-2 text-right">Sales</th>
                                        <th className="w-32 py-2 pl-3">Share of orders</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {p.services.map((x) => (
                                        <tr
                                            key={x.name}
                                            className="border-t border-pw-ink/10"
                                        >
                                            <td className="py-2 pr-3 font-semibold">
                                                {x.name}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {x.orders}
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                                                {x.quantity} {x.unit}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {peso(x.sales)}
                                            </td>
                                            <td className="py-2 pl-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <Bar pct={x.share} />
                                                    </div>
                                                    <span className="w-9 text-right text-xs tabular-nums">
                                                        {x.share}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>

                {/* 7. Customers */}
                <Section
                    n={7}
                    title="Your customers"
                    intro="“New” means this was their first order ever. “Returning” means they had ordered before."
                >
                    {c.total === 0 ? (
                        <Empty>No customers ordered in this period.</Empty>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-xl border border-pw-ink/15 p-3">
                                    <p className="font-serif text-3xl">{c.total}</p>
                                    <p className="text-xs text-pw-ink/70">Customers</p>
                                </div>
                                <div className="rounded-xl border border-pw-ink/15 p-3">
                                    <p className="font-serif text-3xl">{c.new}</p>
                                    <p className="text-xs text-pw-ink/70">New</p>
                                </div>
                                <div className="rounded-xl border border-pw-ink/15 p-3">
                                    <p className="font-serif text-3xl">{c.returning}</p>
                                    <p className="text-xs text-pw-ink/70">
                                        Returning
                                        {c.repeatRate !== null && ` (${c.repeatRate}%)`}
                                    </p>
                                </div>
                            </div>
                            {c.top.length > 0 && (
                                <table className="mt-4 w-full text-left text-sm">
                                    <caption className="mb-1 text-left text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                        Top customers by money spent
                                    </caption>
                                    <tbody>
                                        {c.top.map((t, i) => (
                                            <tr
                                                key={t.name + i}
                                                className="border-t border-pw-ink/10"
                                            >
                                                <td className="w-8 py-2 text-pw-ink/70">
                                                    {i + 1}
                                                </td>
                                                <td className="py-2 font-semibold">
                                                    {t.name}
                                                </td>
                                                <td className="py-2 text-right text-pw-ink/70">
                                                    {t.orders}{' '}
                                                    {t.orders === 1 ? 'order' : 'orders'}
                                                </td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {peso(t.spent)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                </Section>

                {/* 8. Busy times */}
                <Section
                    n={8}
                    title="Busy times"
                    intro="When customers place orders. Useful for planning who works when."
                >
                    {p.peak.day ? (
                        <>
                            <p className="text-sm">
                                Your busiest day is{' '}
                                <strong>{p.peak.day}</strong>, and the busiest
                                hour is around <strong>{p.peak.hour}</strong>.
                            </p>
                            <div className="mt-3 space-y-1.5">
                                {p.weekdays.map((d) => (
                                    <div
                                        key={d.day}
                                        className="flex items-center gap-3 text-sm"
                                    >
                                        <span className="w-24 shrink-0">{d.day}</span>
                                        <div className="flex-1">
                                            <Bar pct={(d.orders / maxDay) * 100} color="#5C8CA8" />
                                        </div>
                                        <span className="w-8 text-right tabular-nums">
                                            {d.orders}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <Empty>No orders in this period.</Empty>
                    )}
                </Section>

                {/* 9. Customer feedback */}
                <Section
                    n={9}
                    title="Customer feedback"
                    intro="Star ratings customers leave on finished orders (1 = poor, 5 = excellent), with their comments."
                >
                    {r.count === 0 ? (
                        <Empty>
                            {r.ready
                                ? 'No ratings for this period yet. Customers can rate a finished order from My Orders.'
                                : 'Ratings have not been switched on yet.'}
                        </Empty>
                    ) : (
                        <>
                            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
                                <div className="rounded-2xl border border-pw-ink/15 p-4 text-center">
                                    <p className="font-serif text-5xl">
                                        {r.average?.toFixed(1)}
                                    </p>
                                    <Stars value={r.average ?? 0} className="text-xl" />
                                    <p className="mt-1 text-xs text-pw-ink/70">
                                        {r.count} {r.count === 1 ? 'rating' : 'ratings'}
                                        {r.responseRate !== null &&
                                            ` · ${r.responseRate}% of finished orders`}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    {r.distribution.map((d) => (
                                        <div
                                            key={d.stars}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <span className="w-14 shrink-0">
                                                {d.stars} {d.stars === 1 ? 'star' : 'stars'}
                                            </span>
                                            <div className="flex-1">
                                                <Bar
                                                    pct={(d.count / r.count) * 100}
                                                    color={d.stars >= 4 ? '#2f7d52' : d.stars === 3 ? '#C9822A' : '#B33A1A'}
                                                />
                                            </div>
                                            <span className="w-8 text-right tabular-nums">
                                                {d.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {(r.needsAttention.length > 0 || r.praise.length > 0) && (
                                <div className="mt-5 grid gap-5 md:grid-cols-2 print:grid-cols-2">
                                    <div>
                                        <h3 className="mb-2 text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                            To improve (3 stars or fewer)
                                        </h3>
                                        {r.needsAttention.length ? (
                                            <ul className="space-y-2">
                                                {r.needsAttention.map((q) => (
                                                    <Quote key={q.order} c={q} />
                                                ))}
                                            </ul>
                                        ) : (
                                            <Empty>No low ratings with comments.</Empty>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="mb-2 text-xs font-semibold tracking-[0.2em] text-pw-ink/70 uppercase">
                                            What customers liked
                                        </h3>
                                        {r.praise.length ? (
                                            <ul className="space-y-2">
                                                {r.praise.map((q) => (
                                                    <Quote key={q.order} c={q} />
                                                ))}
                                            </ul>
                                        ) : (
                                            <Empty>No comments from happy customers yet.</Empty>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Section>

                {/* Footer */}
                <footer className="mt-10 break-inside-avoid border-t border-pw-ink/15 pt-4 text-xs text-pw-ink/70">
                    <p className="font-semibold text-pw-ink">
                        How to read this report
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        <li>
                            An order counts in the period it was <em>placed</em>.
                            “Finished” means it was claimed or delivered.
                        </li>
                        <li>
                            <strong>Sales</strong> = laundry price of finished
                            orders (same as the dashboard).{' '}
                            <strong>Received</strong> = payments that came in
                            during the dates, including delivery fees.
                        </li>
                        <li>
                            “The period before” is the same length of time just
                            earlier (for “This month”, the same days of last
                            month).
                        </li>
                        <li>
                            Advice uses simple targets you can change in
                            config/laundry.php.
                        </li>
                    </ul>
                    <p className="mt-3">
                        {p.shop.name} · Printed {stamp(p.generatedAt)} · All times
                        are Philippine time.
                    </p>
                </footer>
            </article>
        </Shell>
    );
}
