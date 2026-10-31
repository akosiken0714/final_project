import { router, useForm, Head } from '@inertiajs/react';
import Shell from '@/components/Shell';
import { useState } from 'react';

const field =
    'border-0 border-b border-pw-ink/30 bg-transparent px-0 py-2 text-pw-ink outline-none transition focus:border-pw-ink focus:shadow-[0_1px_0_0_#F0A98B]';

function Row({ s }: { s: any }) {
    const [name, setName] = useState(s.name);
    const [unit, setUnit] = useState(s.unit);
    const [price, setPrice] = useState(s.price);

    const dirty =
        name !== s.name || unit !== s.unit || String(price) !== String(s.price);

    const save = () =>
        router.patch(
            `/admin/services/${s.id}`,
            { name, unit, price },
            {
                preserveScroll: true,
                onError: (e) => alert(Object.values(e)[0]),
            },
        );

    const remove = () => {
        if (!confirm(`Delete "${s.name}" permanently? This cannot be undone.`))
            return;
        router.delete(`/admin/services/${s.id}`, { preserveScroll: true });
    };

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-pw-cream p-4 text-pw-ink shadow-lg">
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`flex-1 font-serif text-xl ${field}`}
            />
            <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={field}
            >
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
                className="rounded-full bg-pw-ink px-5 py-2 text-sm font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
                Save
            </button>
            <button
                onClick={() =>
                    router.patch(
                        `/admin/services/${s.id}`,
                        { active: !s.active },
                        { preserveScroll: true },
                    )
                }
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${s.active ? 'border-pw-ink/40 text-pw-ink hover:bg-pw-ink/10' : 'border-pw-clay text-pw-rust hover:bg-pw-clay/10'}`}
            >
                {s.active ? 'Active' : 'Hidden'}
            </button>
            <button
                onClick={remove}
                className="rounded-full border border-pw-clay/60 px-5 py-2 text-sm font-semibold text-pw-rust transition hover:bg-pw-clay hover:text-pw-cream"
            >
                Delete
            </button>
        </div>
    );
}

export default function Services({ services }: { services: any[] }) {
    const { data, setData, post, reset, errors } = useForm({
        name: '',
        unit: 'kg',
        price: '',
    });
    return (
        <Shell>
            <Head title="Pricing" />
            <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                Admin
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                Price <span className="text-pw-peach italic">list</span>
            </h1>

            <div className="mt-8 grid gap-4">
                {services.map((s) => (
                    <Row key={s.id + '-' + s.price} s={s} />
                ))}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    post('/admin/services', { onSuccess: () => reset() });
                }}
                className="mt-10 rounded-3xl bg-pw-cream p-6 text-pw-ink shadow-xl"
            >
                <p className="text-xs tracking-[0.3em] text-pw-ink/70 uppercase">
                    New service
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-4">
                    <input
                        placeholder="Service name"
                        className={`flex-1 ${field}`}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                    />
                    <select
                        className={field}
                        value={data.unit}
                        onChange={(e) => setData('unit', e.target.value)}
                    >
                        <option>kg</option>
                        <option>load</option>
                    </select>
                    <input
                        type="number"
                        min="1"
                        max="10000"
                        step="0.01"
                        placeholder="Price"
                        className={`w-28 ${field}`}
                        value={data.price}
                        onChange={(e) => setData('price', e.target.value)}
                    />
                    <button className="rounded-full bg-pw-ink px-6 py-2 text-sm font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink">
                        + Add
                    </button>
                </div>
                {Object.values(errors).map((e) => (
                    <p key={e} className="mt-3 text-sm text-red-600">
                        {e}
                    </p>
                ))}
            </form>
        </Shell>
    );
}
