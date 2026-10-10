import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Shell from '@/components/Shell';

const peso = (n: number) => '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });
const when = (iso: string) =>
    new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

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
    event.startsWith('payment.failed') ? 'bg-[#C4441F]/15 text-[#C4441F]'
    : event.startsWith('payment.') ? 'bg-[#2f7d52]/15 text-[#2f7d52]'
    : event.startsWith('order.') ? 'bg-[#5C8CA8]/25 text-[#1f4a63]'
    : 'bg-[#0F1E2B]/10 text-[#0F1E2B]';

export default function History({ logs, type, q, types, received }: any) {
    const [search, setSearch] = useState(q ?? '');
    const go = (data: Record<string, string>) => router.get('/admin/history', data, { preserveState: true, replace: true });
    const cards = [['Received today', received.today], ['This week', received.week], ['This month', received.month]];
    const qs = new URLSearchParams({ type, ...(q ? { q } : {}) }).toString();

    return (
        <Shell>
            <Head title="History" />
            <p className="text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Admin</p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl">
                Shop <span className="italic text-[#F0A98B]">history</span>
            </h1>
            <p className="mt-3 max-w-xl text-[#F7F1E8]/60">Every order, status change, payment and admin action, newest first. Times are Philippine time.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {cards.map(([label, val]) => (
                    <div key={label as string} className="rounded-3xl bg-[#F7F1E8] p-5 text-[#0F1E2B] shadow-xl">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-[#0F1E2B]/55">{label}</p>
                        <p className="mt-1 font-serif text-4xl">{peso(val as number)}</p>
                        <p className="text-xs text-[#0F1E2B]/50">money received (cash + GCash)</p>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
                {Object.entries(types).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => go({ type: key, ...(search ? { q: search } : {}) })}
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${key === type ? 'border-[#F0A98B] bg-[#F0A98B] font-semibold text-[#0F1E2B]' : 'border-[#F7F1E8]/30 text-[#F7F1E8] hover:border-[#F0A98B]'}`}
                    >
                        {label as string}
                    </button>
                ))}
                <a href={`/admin/history/export?${qs}`} className="ml-auto rounded-full border border-[#F7F1E8]/30 px-4 py-1.5 text-sm text-[#F7F1E8] transition hover:border-[#F0A98B] hover:text-[#F0A98B]">
                    Download CSV
                </a>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); go({ type, ...(search.trim() ? { q: search.trim() } : {}) }); }} className="mt-4 flex max-w-md gap-2">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search history"
                    placeholder="Search a name, order #0012, GCash..."
                    className="w-full rounded-full border border-[#F7F1E8]/25 bg-transparent px-4 py-2 text-sm text-[#F7F1E8] outline-none placeholder:text-[#F7F1E8]/40 focus:border-[#F0A98B]"
                />
                <button className="rounded-full bg-[#F7F1E8] px-5 py-2 text-sm font-semibold text-[#0F1E2B] transition hover:bg-[#F0A98B]">Search</button>
            </form>

            <div className="mt-6 overflow-x-auto rounded-3xl bg-[#F7F1E8] text-[#0F1E2B] shadow-xl">
                <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-[#0F1E2B]/55">
                        <tr>
                            <th className="px-4 py-4">When</th>
                            <th className="px-4 py-4">Type</th>
                            <th className="px-4 py-4">What happened</th>
                            <th className="px-4 py-4">By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.data.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-10 text-center text-[#0F1E2B]/55">Nothing here yet. New activity shows up as it happens.</td></tr>
                        )}
                        {logs.data.map((l: any) => (
                            <tr key={l.id} className="border-t border-[#0F1E2B]/10 align-top">
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-[#0F1E2B]/65">{l.at ? when(l.at) : ''}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-block whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold ${tone(l.event)}`}>{LABELS[l.event] ?? l.event}</span>
                                </td>
                                <td className="px-4 py-3">{l.summary}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-[#0F1E2B]/65">{l.who}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(logs.prev_page_url || logs.next_page_url) && (
                <div className="mt-6 flex items-center justify-between text-sm text-[#F7F1E8]/70">
                    {logs.prev_page_url ? <Link href={logs.prev_page_url} preserveScroll className="rounded-full border border-[#F7F1E8]/30 px-4 py-1.5 hover:border-[#F0A98B]">← Newer</Link> : <span />}
                    <span>Page {logs.current_page} of {logs.last_page}</span>
                    {logs.next_page_url ? <Link href={logs.next_page_url} preserveScroll className="rounded-full border border-[#F7F1E8]/30 px-4 py-1.5 hover:border-[#F0A98B]">Older →</Link> : <span />}
                </div>
            )}
        </Shell>
    );
}
