import { router, useForm, Head } from '@inertiajs/react';
import Shell from '@/components/Shell';
import { useState } from 'react';

const field = 'border-0 border-b border-[#0F1E2B]/30 bg-transparent px-0 py-2 text-[#0F1E2B] outline-none transition focus:border-[#0F1E2B] focus:shadow-[0_1px_0_0_#F0A98B]';

function Row({ s }: { s: any }) {
    const [name, setName] = useState(s.name);
    const [unit, setUnit] = useState(s.unit);
    const [price, setPrice] = useState(s.price);

    const dirty = name !== s.name || unit !== s.unit || String(price) !== String(s.price);

    const save = () =>
        router.patch(
            `/admin/services/${s.id}`,
            { name, unit, price },
            { preserveScroll: true, onError: (e) => alert(Object.values(e)[0]) },
        );

    const remove = () => {
        if (!confirm(`Delete "${s.name}" permanently? This cannot be undone.`)) return;
        router.delete(`/admin/services/${s.id}`, { preserveScroll: true });
    };

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-[#F7F1E8] p-4 text-[#0F1E2B] shadow-lg">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`flex-1 font-serif text-xl ${field}`}
            />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={field}>
                <option value="kg">kg</option>
                <option value="load">load</option>
            </select>
            <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-28 ${field}`}
            />
            <button
                onClick={save}
                disabled={!dirty}
                className="rounded-full bg-[#0F1E2B] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B] disabled:cursor-not-allowed disabled:opacity-40"
            >
                Save
            </button>
            <button
                onClick={() => router.patch(`/admin/services/${s.id}`, { active: !s.active }, { preserveScroll: true })}
                className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-widest transition ${s.active ? 'border-[#0F1E2B]/40 text-[#0F1E2B] hover:bg-[#0F1E2B]/10' : 'border-[#C96F48] text-[#C96F48] hover:bg-[#C96F48]/10'}`}
            >
                {s.active ? 'Active' : 'Hidden'}
            </button>
            <button
                onClick={remove}
                className="rounded-full border border-[#C96F48]/60 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-[#C96F48] transition hover:bg-[#C96F48] hover:text-[#F7F1E8]"
            >
                Delete
            </button>
        </div>
    );
}

export default function Services({ services }: { services: any[] }) {
    const { data, setData, post, reset, errors } = useForm({ name: '', unit: 'kg', price: '' });
    return (
        <Shell>
            <Head title="Pricing" />
            <p className=" text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Admin</p>
            <h1 className=" mt-3 font-serif text-5xl md:text-6xl">
                Price <span className="italic text-[#F0A98B]">list</span>
            </h1>

            <div className="mt-10 grid gap-3">{services.map((s) => <Row key={s.id + '-' + s.price} s={s} />)}</div>

            <form
                onSubmit={(e) => { e.preventDefault(); post('/admin/services', { onSuccess: () => reset() }); }}
                className="mt-10 rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl"
            >
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#0F1E2B]/50">New service</p>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                    <input placeholder="Service name" className={`flex-1 ${field}`} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    <select className={field} value={data.unit} onChange={(e) => setData('unit', e.target.value)}><option>kg</option><option>load</option></select>
                    <input type="number" min="1" max="10000" step="0.01" placeholder="Price" className={`w-28 ${field}`} value={data.price} onChange={(e) => setData('price', e.target.value)} />
                    <button className="rounded-full bg-[#0F1E2B] px-6 py-2 text-sm font-semibold text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B]">+ Add</button>
                </div>
                {Object.values(errors).map((e) => <p key={e} className="mt-3 text-sm text-red-600">{e}</p>)}
            </form>
        </Shell>
    );
}