import { Head } from '@inertiajs/react';
import Shell from '@/components/Shell';

export default function Customers({ customers }: { customers: any[] }) {
    return (
        <Shell>
            <Head title="Customers" />
            <p className="rise text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Admin</p>
            <h1 className="rise mt-3 font-serif text-5xl md:text-6xl" style={{ animationDelay: '.1s' }}>
                Our <span className="italic text-[#F0A98B]">customers</span>
            </h1>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
                {customers.map((c, i) => (
                    <div key={c.id} className="rise rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl transition hover:-translate-y-1" style={{ animationDelay: `${i * 0.06}s` }}>
                        <div className="mb-3 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                        <h3 className="font-serif text-2xl">{c.name}</h3>
                        <p className="text-sm text-[#0F1E2B]/60">{c.email}</p>
                        <p className="mt-3 text-sm">{c.phone || 'No contact'} · {c.address || 'No address'}</p>
                        <p className="mt-4 border-t border-dashed border-[#0F1E2B]/25 pt-3 text-[10px] uppercase tracking-[0.25em] text-[#C96F48]">{c.orders_count} orders</p>
                    </div>
                ))}
            </div>
        </Shell>
    );
}