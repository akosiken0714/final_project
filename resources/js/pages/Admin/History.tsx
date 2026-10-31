import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Shell from '@/components/Shell';

const peso = (n: number) =>
    '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const when = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

const LABELS: Record<string, string> = {
    'order.placed': 'New order',
    'order.status': 'Status',
    'payment.cash': 'Cash paid',
    'payment.gcash': 'GCash paid',
    'payment.failed': 'Payment failed',
    'user.created': 'Account',
    'service.created': 'Pricing',
    'service.updated': 'Pricing',
    'service.deleted': 'Pricing',
};

const tone = (event: string) =>
    event.startsWith('payment.failed')
        ? 'bg-pw-danger/15 text-pw-danger'
        : event.startsWith('payment.')
          ? 'bg-pw-ok/15 text-pw-ok'
          : event.startsWith('order.')
            ? 'bg-pw-steel/25 text-pw-deep'
            : 'bg-pw-ink/10 text-pw-ink';

export default function History({ logs, type, q, types, received }: any) {
    const [search, setSearch] = useState(q ?? '');
    const go = (data: Record<string, string>) =>
        router.get('/admin/history', data, {
            preserveState: true,
            replace: true,
        });
    const cards = [
        ['Received today', received.today],
        ['This week', received.week],
        ['This month', received.month],
    ];
    const qs = new URLSearchParams({ type, ...(q ? { q } : {}) }).toString();

    return (
        <Shell>
            <Head title="History" />
            <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                Admin
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                Shop <span className="text-pw-peach italic">history</span>
            </h1>
            <p className="mt-3 max-w-xl text-pw-cream/60">
                Every order, status change, payment and admin action, newest
                first. Times are Philippine time.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {cards.map(([label, val]) => (
                    <div
                        key={label as string}
                        className="rounded-3xl bg-pw-cream p-5 text-pw-ink shadow-xl"
                    >
                        <p className="text-xs tracking-[0.18em] text-pw-ink/70 uppercase">
                            {label}
                        </p>
                        <p className="mt-1 font-serif text-4xl">
                            {peso(val as number)}
                        </p>
                        <p className="text-xs text-pw-ink/70">
                            money received (cash + GCash)
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
                {Object.entries(types).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() =>
                            go({ type: key, ...(search ? { q: search } : {}) })
                        }
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${key === type ? 'border-pw-peach bg-pw-peach font-semibold text-pw-ink' : 'border-pw-cream/30 text-pw-cream hover:border-pw-peach'}`}
                    >
                        {label as string}
                    </button>
                ))}
                <a
                    href={`/admin/history/export?${qs}`}
                    className="ml-auto rounded-full border border-pw-cream/30 px-4 py-1.5 text-sm text-pw-cream transition hover:border-pw-peach hover:text-pw-peach"
                >
                    Download CSV
                </a>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    go({
                        type,
                        ...(search.trim() ? { q: search.trim() } : {}),
                    });
                }}
                className="mt-4 flex max-w-md gap-2"
            >
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search history"
                    placeholder="Search a name, order #0012, GCash..."
                    className="w-full rounded-full border border-pw-cream/25 bg-transparent px-4 py-2 text-sm text-pw-cream outline-none placeholder:text-pw-cream/65 focus:border-pw-peach"
                />
                <button className="rounded-full bg-pw-cream px-5 py-2 text-sm font-semibold text-pw-ink transition hover:bg-pw-peach">
                    Search
                </button>
            </form>

            <div className="mt-6 overflow-x-auto rounded-3xl bg-pw-cream text-pw-ink shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead className="text-xs tracking-[0.2em] text-pw-ink/70 uppercase">
                        <tr>
                            <th className="px-4 py-4">When</th>
                            <th className="px-4 py-4">Type</th>
                            <th className="px-4 py-4">What happened</th>
                            <th className="px-4 py-4">By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={4}
                                    className="px-4 py-10 text-center text-pw-ink/70"
                                >
                                    Nothing here yet. New activity shows up as
                                    it happens.
                                </td>
                            </tr>
                        )}
                        {logs.data.map((l: any) => (
                            <tr
                                key={l.id}
                                className="border-t border-pw-ink/10 align-top"
                            >
                                <td className="px-4 py-3 text-xs whitespace-nowrap text-pw-ink/70">
                                    {l.at ? when(l.at) : ''}
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap ${tone(l.event)}`}
                                    >
                                        {LABELS[l.event] ?? l.event}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{l.summary}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-pw-ink/70">
                                    {l.who}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(logs.prev_page_url || logs.next_page_url) && (
                <div className="mt-6 flex items-center justify-between text-sm text-pw-cream/70">
                    {logs.prev_page_url ? (
                        <Link
                            href={logs.prev_page_url}
                            preserveScroll
                            className="rounded-full border border-pw-cream/30 px-4 py-1.5 hover:border-pw-peach"
                        >
                            ← Newer
                        </Link>
                    ) : (
                        <span />
                    )}
                    <span>
                        Page {logs.current_page} of {logs.last_page}
                    </span>
                    {logs.next_page_url ? (
                        <Link
                            href={logs.next_page_url}
                            preserveScroll
                            className="rounded-full border border-pw-cream/30 px-4 py-1.5 hover:border-pw-peach"
                        >
                            Older →
                        </Link>
                    ) : (
                        <span />
                    )}
                </div>
            )}
        </Shell>
    );
}
