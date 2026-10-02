import { Link, Head, router, usePage } from '@inertiajs/react';
import Shell from '@/components/Shell';
import StatusBadge from '@/components/StatusBadge';

const steps = ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'];

export default function Index({ orders }: { orders: any[] }) {
    const { auth }: any = usePage().props;
    const first = (auth?.user?.name ?? '').split(' ')[0];
    const active = orders.find((o) => o.status !== 'Completed');
    const last = orders[0];
    const spent = orders.filter((o) => o.status === 'Completed').reduce((n, o) => n + Number(o.total), 0);

    const stats = [
        ['Orders', orders.length],
        ['In progress', orders.filter((o) => o.status === 'In Progress').length],
        ['Total spent', '₱' + spent.toFixed(0)],
    ];

    return (
        <Shell>
            <Head title="My Orders" />
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="rise text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Your laundry</p>
                    <h1 className="rise mt-3 font-serif text-5xl md:text-6xl" style={{ animationDelay: '.1s' }}>
                        My <span className="italic text-[#F0A98B]">orders</span>
                    </h1>
                    {first && <p className="rise mt-3 text-[#F7F1E8]/60" style={{ animationDelay: '.15s' }}>Hi {first}, here's where your laundry is.</p>}
                </div>
                <div className="rise flex flex-wrap gap-3" style={{ animationDelay: '.2s' }}>
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

            {active && (
                <div className="rise mt-8 inline-flex items-center gap-3 rounded-full bg-[#F0A98B] px-5 py-2 text-sm font-semibold text-[#0F1E2B]" style={{ animationDelay: '.25s' }}>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F1E2B]" />
                    Order #{String(active.id).padStart(4, '0')} · {active.status}
                </div>
            )}

            {orders.length > 0 && (
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {stats.map(([l, v], i) => (
                        <div key={l} className="rise rounded-3xl bg-[#F7F1E8] p-5 text-[#0F1E2B] shadow-xl" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="mb-3 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                            <p className="text-xs uppercase tracking-[0.2em] text-[#0F1E2B]/60">{l}</p>
                            <p className="mt-1 font-serif text-4xl">{v}</p>
                        </div>
                    ))}
                </div>
            )}

            {orders.length === 0 && (
                <div className="mt-10 rounded-3xl border border-dashed border-[#F7F1E8]/25 p-12 text-center">
                    <p className="font-serif text-3xl">No orders <span className="italic text-[#F0A98B]">yet</span></p>
                    <p className="mx-auto mt-2 max-w-sm text-[#F7F1E8]/60">Pick a service, enter your kilos, and we'll take it from there.</p>
                    <Link href="/orders/create" className="mt-6 inline-block rounded-full bg-[#F7F1E8] px-7 py-3 text-sm font-semibold text-[#0F1E2B] transition hover:-translate-y-0.5 hover:bg-[#F0A98B]">
                        Place your first order
                    </Link>
                </div>
            )}

            <div className="mt-10 grid gap-6 md:grid-cols-2">
                {orders.map((o, i) => {
                    const step = steps.indexOf(o.status);
                    return (
                        <div key={o.id} className="rise rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl" style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-[#0F1E2B]/60">Order tag</p>
                                    <p className="mt-1 font-serif text-3xl">#{String(o.id).padStart(4, '0')}</p>
                                </div>
                                <StatusBadge status={o.status} />
                            </div>

                            <p className="mt-4 text-sm font-semibold">{o.service.name}</p>
                            <p className="text-sm text-[#0F1E2B]/70">{Number(o.quantity)} {o.service.unit}</p>
                            {o.address && <p className="mt-1 text-sm text-[#0F1E2B]/70">{o.address}</p>}

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
                                <span className="text-xs uppercase tracking-widest text-[#0F1E2B]/60">Total</span>
                                <span className="font-serif text-2xl">₱{o.total}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Shell>
    );
}