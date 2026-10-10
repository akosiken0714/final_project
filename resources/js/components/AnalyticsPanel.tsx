import { Link } from '@inertiajs/react';
import { ReactNode } from 'react';

type Daily = { date: string; orders: number; revenue: number };

export type Props = {
    range: number;
    ranges: number[];
    summary: {
        orders: number;
        ordersDelta: number | null;
        revenue: number;
        revenueDelta: number | null;
        average: number;
    };
    daily: Daily[];
    heat: number[][];
    peak: { day: string | null; hour: string | null };
    services: { name: string; orders: number; revenue: number }[];
    pipeline: { status: string; count: number }[];
    oldestPendingHours: number | null;
    turnaround: { avgHours: number | null; sample: number };
    customers: {
        new: number;
        returning: number;
        top: { name: string; orders: number; spent: number }[];
    };
    stuck: {
        hours: number;
        count: number;
        list: { id: number; status: string; hours: number }[];
    };
    photoRate: number | null;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const peso = (n: number) =>
    '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
const duration = (h: number) =>
    h < 1
        ? `${Math.round(h * 60)} min`
        : h < 48
          ? `${h.toFixed(1)} hrs`
          : `${(h / 24).toFixed(1)} days`;

function Card({
    title,
    note,
    children,
    className = '',
}: {
    title: string;
    note?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl ${className}`}
        >
            <h2 className="text-[10px] tracking-[0.25em] text-[#0F1E2B]/55 uppercase">
                {title}
            </h2>
            {note && <p className="mt-1 text-xs text-[#0F1E2B]/55">{note}</p>}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="py-6 text-sm text-[#0F1E2B]/50">{children}</p>;
}

function Delta({ value }: { value: number | null }) {
    if (value === null)
        return (
            <span className="text-xs text-[#0F1E2B]/45">
                no earlier data to compare
            </span>
        );
    const up = value >= 0;
    return (
        <span
            className={`text-xs font-semibold ${up ? 'text-[#2f7d52]' : 'text-[#C4441F]'}`}
        >
            {up ? '▲' : '▼'} {Math.abs(value)}%{' '}
            <span className="font-normal text-[#0F1E2B]/45">
                vs previous period
            </span>
        </span>
    );
}

// one chart for both orders (bars) and revenue (line), drawn as plain SVG
function Trend({
    data,
    field,
    kind,
    format,
}: {
    data: Daily[];
    field: 'orders' | 'revenue';
    kind: 'bar' | 'line';
    format: (n: number) => string;
}) {
    const W = 600;
    const H = 170;
    const pad = { l: 8, r: 8, t: 12, b: 22 };
    const max = Math.max(1, ...data.map((d) => d[field]));
    const n = data.length;
    const x = (i: number) =>
        pad.l +
        (n === 1
            ? (W - pad.l - pad.r) / 2
            : (i / (n - 1)) * (W - pad.l - pad.r));
    const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
    const total = data.reduce((s, d) => s + d[field], 0);
    const bw = Math.max(2, (W - pad.l - pad.r) / n - 2);

    if (total === 0)
        return <Empty>Nothing to chart for this period yet.</Empty>;

    const line = data
        .map(
            (d, i) =>
                `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[field]).toFixed(1)}`,
        )
        .join(' ');
    const area = `${line} L ${x(n - 1).toFixed(1)} ${H - pad.b} L ${x(0).toFixed(1)} ${H - pad.b} Z`;

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label={`${field} per day, highest ${format(max)}`}
        >
            <line
                x1={pad.l}
                x2={W - pad.r}
                y1={H - pad.b}
                y2={H - pad.b}
                stroke="#0F1E2B"
                strokeOpacity="0.2"
            />
            {kind === 'bar' ? (
                data.map((d, i) => (
                    <rect
                        key={d.date}
                        x={x(i) - bw / 2}
                        y={y(d[field])}
                        width={bw}
                        height={Math.max(0, H - pad.b - y(d[field]))}
                        rx="2"
                        fill="#F0A98B"
                    >
                        <title>{`${d.date}: ${format(d[field])}`}</title>
                    </rect>
                ))
            ) : (
                <>
                    <path d={area} fill="#F0A98B" fillOpacity="0.28" />
                    <path
                        d={line}
                        fill="none"
                        stroke="#C96F48"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {n <= 60 &&
                        data.map((d, i) => (
                            <circle
                                key={d.date}
                                cx={x(i)}
                                cy={y(d[field])}
                                r="3"
                                fill="#C96F48"
                            >
                                <title>{`${d.date}: ${format(d[field])}`}</title>
                            </circle>
                        ))}
                </>
            )}
            <text
                x={pad.l}
                y={H - 6}
                fontSize="11"
                fill="#0F1E2B"
                fillOpacity="0.55"
            >
                {data[0].date}
            </text>
            <text
                x={W - pad.r}
                y={H - 6}
                fontSize="11"
                fill="#0F1E2B"
                fillOpacity="0.55"
                textAnchor="end"
            >
                {data[n - 1].date}
            </text>
            <text
                x={W - pad.r}
                y={pad.t - 2}
                fontSize="11"
                fill="#0F1E2B"
                fillOpacity="0.55"
                textAnchor="end"
            >{`peak ${format(max)}`}</text>
        </svg>
    );
}

function Heatmap({ heat }: { heat: number[][] }) {
    const max = Math.max(1, ...heat.flat());
    return (
        <div className="overflow-x-auto">
            <div className="min-w-[520px]">
                <div
                    className="grid gap-[3px]"
                    style={{
                        gridTemplateColumns: '34px repeat(24, minmax(0, 1fr))',
                    }}
                >
                    <div />
                    {Array.from({ length: 24 }, (_, h) => (
                        <div
                            key={h}
                            className="text-center text-[9px] text-[#0F1E2B]/50"
                        >
                            {h % 3 === 0 ? hourLabel(h) : ''}
                        </div>
                    ))}
                    {heat.map((row, d) => (
                        <div key={d} className="contents">
                            <div className="pr-1 text-right text-[10px] leading-5 text-[#0F1E2B]/55">
                                {DAYS[d]}
                            </div>
                            {row.map((v, h) => (
                                <div
                                    key={h}
                                    className="h-5 rounded-[3px]"
                                    style={{
                                        background:
                                            v === 0
                                                ? 'rgba(15,30,43,0.06)'
                                                : `rgba(240,169,139,${0.25 + 0.75 * (v / max)})`,
                                    }}
                                    title={`${DAYS[d]} ${hourLabel(h)}: ${v} order${v === 1 ? '' : 's'}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Bars({
    rows,
    format,
}: {
    rows: { label: string; value: number; extra?: string }[];
    format?: (n: number) => string;
}) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <ul className="space-y-3">
            {rows.map((r) => (
                <li key={r.label}>
                    <div className="flex justify-between gap-3 text-sm">
                        <span className="truncate">{r.label}</span>
                        <span className="shrink-0 text-[#0F1E2B]/60">
                            {r.extra ?? (format ? format(r.value) : r.value)}
                        </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#0F1E2B]/10">
                        <div
                            className="h-2 rounded-full bg-[#F0A98B]"
                            style={{ width: `${(r.value / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function Fact({
    label,
    value,
    hint,
}: {
    label: string;
    value: ReactNode;
    hint?: string;
}) {
    return (
        <div className="border-t border-dashed border-[#0F1E2B]/20 py-3 first:border-t-0 first:pt-0">
            <p className="text-[10px] tracking-[0.2em] text-[#0F1E2B]/55 uppercase">
                {label}
            </p>
            <p className="mt-1 font-serif text-2xl">{value}</p>
            {hint && <p className="text-xs text-[#0F1E2B]/50">{hint}</p>}
        </div>
    );
}

export default function AnalyticsPanel(p: Props & { view: string }) {
    const { summary, customers, stuck, turnaround } = p;
    const hasOrders = summary.orders > 0;
    const trendKind = p.daily.length <= 90 ? 'bar' : 'line';

    return (
        <>
            <p className="text-[#F7F1E8]/60">
                Times are in Philippine time. Revenue counts completed orders
                only.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                {p.ranges.map((r) => (
                    <Link
                        key={r}
                        href={`/admin?range=${r}&view=${p.view}`}
                        preserveScroll
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${r === p.range ? 'border-[#F0A98B] bg-[#F0A98B] font-semibold text-[#0F1E2B]' : 'border-[#F7F1E8]/30 text-[#F7F1E8] hover:border-[#F0A98B]'}`}
                    >
                        {r === 365 ? '1 year' : `${r} days`}
                    </Link>
                ))}
                <a
                    href={`/admin/analytics/export?range=${p.range}`}
                    className="ml-auto rounded-full border border-[#F7F1E8]/30 px-4 py-1.5 text-sm text-[#F7F1E8] transition hover:border-[#F0A98B] hover:text-[#F0A98B]"
                >
                    Download CSV
                </a>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Card title="Orders">
                    <p className="font-serif text-5xl">{summary.orders}</p>
                    <Delta value={summary.ordersDelta} />
                </Card>
                <Card title="Revenue" note="Completed orders">
                    <p className="font-serif text-5xl">
                        {peso(summary.revenue)}
                    </p>
                    <Delta value={summary.revenueDelta} />
                </Card>
                <Card title="Average order" note="All orders in this period">
                    <p className="font-serif text-5xl">
                        {peso(summary.average)}
                    </p>
                </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card title="Orders per day">
                    <Trend
                        data={p.daily}
                        field="orders"
                        kind={trendKind}
                        format={(n) => `${n} order${n === 1 ? '' : 's'}`}
                    />
                </Card>
                <Card title="Revenue per day">
                    <Trend
                        data={p.daily}
                        field="revenue"
                        kind="line"
                        format={peso}
                    />
                </Card>
            </div>

            <Card
                title="Peak times"
                note="When orders are placed, by day and hour"
                className="mt-4"
            >
                {hasOrders ? (
                    <>
                        <Heatmap heat={p.heat} />
                        {p.peak.day && (
                            <p className="mt-4 text-sm text-[#0F1E2B]/70">
                                Busiest day: <b>{p.peak.day}</b> · Busiest hour:{' '}
                                <b>{p.peak.hour}</b>
                            </p>
                        )}
                    </>
                ) : (
                    <Empty>No orders in this period.</Empty>
                )}
            </Card>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card
                    title="Services"
                    note="Orders in this period, with completed revenue"
                >
                    {p.services.length ? (
                        <Bars
                            rows={p.services.map((s) => ({
                                label: s.name,
                                value: s.orders,
                                extra: `${s.orders} · ${peso(s.revenue)}`,
                            }))}
                        />
                    ) : (
                        <Empty>No orders in this period.</Empty>
                    )}
                </Card>
                <Card
                    title="Where orders are right now"
                    note="All orders, any date"
                >
                    <Bars
                        rows={p.pipeline.map((s) => ({
                            label: s.status,
                            value: s.count,
                        }))}
                    />
                </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card title="Customers">
                    <div className="grid grid-cols-2 gap-4">
                        <Fact
                            label="New"
                            value={customers.new}
                            hint="first order in this period"
                        />
                        <Fact
                            label="Returning"
                            value={customers.returning}
                            hint="ordered before this period"
                        />
                    </div>
                    <h3 className="mt-5 text-[10px] tracking-[0.2em] text-[#0F1E2B]/55 uppercase">
                        Top customers
                    </h3>
                    {customers.top.length ? (
                        <ol className="mt-2 space-y-2 text-sm">
                            {customers.top.map((c, i) => (
                                <li
                                    key={i}
                                    className="flex justify-between gap-3"
                                >
                                    <span className="truncate">
                                        {i + 1}. {c.name}
                                    </span>
                                    <span className="shrink-0 text-[#0F1E2B]/60">
                                        {c.orders} order
                                        {c.orders === 1 ? '' : 's'} ·{' '}
                                        {peso(c.spent)}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <Empty>No completed orders yet.</Empty>
                    )}
                </Card>

                <Card title="Speed and attention">
                    <Fact
                        label="Average time to ready"
                        value={
                            turnaround.avgHours === null
                                ? '–'
                                : duration(turnaround.avgHours)
                        }
                        hint={
                            turnaround.sample
                                ? `based on ${turnaround.sample} order${turnaround.sample === 1 ? '' : 's'}`
                                : 'no finished orders with history yet'
                        }
                    />
                    <Fact
                        label="Oldest pending order"
                        value={
                            p.oldestPendingHours === null
                                ? 'None waiting'
                                : duration(p.oldestPendingHours)
                        }
                    />
                    <Fact
                        label="Orders with a photo"
                        value={p.photoRate === null ? '–' : `${p.photoRate}%`}
                    />
                    <Fact
                        label={`Stuck for over ${stuck.hours} hours`}
                        value={stuck.count}
                        hint={stuck.count ? undefined : 'nothing is stuck'}
                    />
                    {stuck.list.length > 0 && (
                        <ul className="mt-1 space-y-1 text-sm">
                            {stuck.list.map((o) => (
                                <li
                                    key={o.id}
                                    className="flex justify-between gap-3"
                                >
                                    <span>
                                        #{String(o.id).padStart(4, '0')} ·{' '}
                                        {o.status}
                                    </span>
                                    <span className="text-[#0F1E2B]/60">
                                        {duration(o.hours)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
}
