import { router, Head } from '@inertiajs/react';
import Shell from '@/components/Shell';
import StatusBadge from '@/components/StatusBadge';

export default function Orders({ orders, statuses, stats }: any) {
    const cards = [
        ['Total orders', stats.total],
        ['Pending', stats.pending],
        ['Ready', stats.ready],
        ['Revenue', '₱' + Number(stats.revenue).toFixed(0)],
    ];
    return (
        <Shell>
            <Head title="Admin Orders" />
            <p className="rise text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Admin</p>
            <h1 className="rise mt-3 font-serif text-5xl md:text-6xl" style={{ animationDelay: '.1s' }}>
                Command <span className="italic text-[#F0A98B]">center</span>
            </h1>

            <div className="mt-10 grid gap-5 md:grid-cols-4">
                {cards.map(([label, val], i) => (
                    <div
                        key={label}
                        className="rise rounded-3xl bg-[#F7F1E8] p-5 text-[#0F1E2B] shadow-xl ring-1 ring-[#0F1E2B]/5 transition hover:-translate-y-0.5 hover:shadow-2xl"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="mb-3 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                        <p className="text-[10px] uppercase tracking-[0.25em] text-[#0F1E2B]/55">{label}</p>
                        <p className="mt-1 font-serif text-4xl">{val}</p>
                    </div>
                ))}
            </div>

            <div className="mt-10 overflow-x-auto rounded-3xl bg-[#F7F1E8] text-[#0F1E2B] shadow-xl ring-1 ring-[#0F1E2B]/5">
                <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.2em] text-[#0F1E2B]/55">
                        <tr>
                            <th className="px-4 py-4">#</th>
                            <th className="px-4 py-4">Customer</th>
                            <th className="px-4 py-4">Service</th>
                            <th className="px-4 py-4">Qty</th>
                            <th className="px-4 py-4">Total</th>
                            <th className="px-4 py-4">Photo</th>
                            <th className="px-4 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((o: any) => (
                            <tr key={o.id} className="border-t border-[#0F1E2B]/10 transition hover:bg-[#0F1E2B]/5">
                                <td className="px-4 py-3 font-serif text-lg">{o.id}</td>
                                <td className="px-4 py-3">
                                    {o.user?.name ?? 'Deleted customer'}
                                    <br />
                                    <span className="text-[#0F1E2B]/50">{o.user?.phone}</span>
                                    {o.address && (
                                        <span className="block max-w-[180px] text-xs text-[#0F1E2B]/50">{o.address}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">{o.service?.name ?? 'Removed service'}</td>
                                <td className="px-4 py-3">{o.quantity}</td>
                                <td className="px-4 py-3">₱{o.total}</td>
                                <td className="px-4 py-3">
                                    {o.photo_url ? (
                                        <a href={o.photo_url} target="_blank" className="text-[#C96F48] underline">
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
                                            if (!confirm(`Change order #${o.id} from "${o.status}" to "${next}"?`)) return;
                                            router.patch(`/admin/orders/${o.id}`, { status: next }, {
                                                preserveScroll: true,
                                                onError: (er) => alert(Object.values(er)[0]),
                                            });
                                        }}
                                        className="mt-2 block rounded-lg border border-[#0F1E2B]/20 bg-transparent p-1 text-xs outline-none transition focus:border-[#0F1E2B] focus:ring-2 focus:ring-[#F0A98B]/30 disabled:opacity-50"
                                    >
                                        {statuses.map((s: string) => (
                                            <option key={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}