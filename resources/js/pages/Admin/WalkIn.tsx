import Req from '@/components/Req';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import Shell from '@/components/Shell';
import { peso } from '@/lib/delivery';

const input =
    'mt-1 w-full rounded-xl border border-pw-ink/25 bg-white px-3 py-2.5 text-sm text-pw-ink outline-none focus:border-pw-ink';
const label = 'text-xs uppercase tracking-[0.18em] text-pw-ink/70';

type Match = { id: number; name: string; phone: string | null; email: string | null };
type Svc = { id: number; name: string; unit: string; price: number | string };

// A customer walks in with a bag: staff type the order in at the counter.
// The laundry is weighed right here, so the amount typed is the real one. Walk-ins are drop-off + cash.
export default function WalkIn({
    services,
    q = '',
    matches = [],
}: {
    services: Svc[];
    q?: string;
    matches?: Match[];
}) {
    const [mode, setMode] = useState<'existing' | 'new'>('existing');
    const [picked, setPicked] = useState<Match | null>(null);
    const [term, setTerm] = useState(q);

    const { data, setData, post, processing, errors } = useForm<{
        customer_id: string;
        name: string;
        phone: string;
        service_id: string;
        quantity: string;
        instructions: string;
        paid_now: boolean;
        item_count: string;
        intake_notes: string;
        photo: File | null;
    }>({
        customer_id: '',
        name: '',
        phone: '',
        service_id: services[0] ? String(services[0].id) : '',
        quantity: '',
        instructions: '',
        paid_now: false,
        item_count: '',
        intake_notes: '',
        photo: null,
    });

    // Search the customers a moment after the person stops typing. Only the matches are reloaded.
    useEffect(() => {
        const t = term.trim();
        if (mode !== 'existing' || t === q) return;
        const id = setTimeout(() => {
            router.get('/admin/walk-in', t ? { q: t } : {}, {
                only: ['matches', 'q'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
        return () => clearTimeout(id);
    }, [term, q, mode]);

    const err = (k: keyof typeof errors) =>
        errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

    const svc = services.find((s) => String(s.id) === data.service_id);
    const qty = Number(data.quantity);
    const qtyOk = data.quantity.trim() !== '' && Number.isFinite(qty) && qty >= 0.1 && qty <= 200;
    const price = svc && qtyOk ? Math.round(Number(svc.price) * qty * 100) / 100 : null;

    const choose = (m: Match) => {
        setPicked(m);
        setData('customer_id', String(m.id));
    };

    const switchMode = (next: 'existing' | 'new') => {
        setMode(next);
        setPicked(null);
        setData((d) => ({ ...d, customer_id: '', name: '', phone: '' }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/walk-in', { forceFormData: true, preserveScroll: true });
    };

    const needsCustomer = mode === 'existing' ? !picked : !data.name.trim() || !data.phone.trim();
    const ready = !needsCustomer && qtyOk && Boolean(data.service_id);

    return (
        <Shell>
            <Head title="Walk-in order" />
            <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                Order desk
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <h1 className="font-serif text-4xl md:text-5xl">
                    Walk-in <span className="text-pw-peach italic">order</span>
                </h1>
                <Link
                    href="/admin"
                    className="btn btn-ghost"
                >
                    Back to orders
                </Link>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-pw-cream/70">
                For a customer at the counter. Weigh the laundry first, then enter the real amount.
                The customer takes it back at the shop and pays cash.
            </p>

            <form
                onSubmit={submit}
                className="mt-8 grid gap-6 rounded-3xl bg-pw-cream p-6 text-pw-ink shadow-xl md:grid-cols-2"
            >
                <p className="text-xs text-pw-ink/70 md:col-span-2">
                    <span className="font-semibold text-red-600">*</span> required
                </p>

                {/* 1. who */}
                <fieldset className="md:col-span-2">
                    <legend className="font-serif text-2xl">1. Customer</legend>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Customer type">
                        {(
                            [
                                ['existing', 'Existing customer'],
                                ['new', 'New walk-in customer'],
                            ] as const
                        ).map(([key, text]) => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={mode === key}
                                onClick={() => switchMode(key)}
                                className={`min-h-11 rounded-full px-5 py-2 text-sm font-semibold transition ${mode === key ? 'bg-pw-ink text-pw-cream' : 'border border-pw-ink/25 hover:bg-pw-ink/5'}`}
                            >
                                {text}
                            </button>
                        ))}
                    </div>

                    {mode === 'existing' ? (
                        <div className="mt-4">
                            {picked ? (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pw-ink/15 bg-white p-4">
                                    <div>
                                        <p className="font-semibold">{picked.name}</p>
                                        <p className="text-xs text-pw-ink/70">
                                            {[picked.phone, picked.email].filter(Boolean).join(' · ') || 'No contact details'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPicked(null);
                                            setData('customer_id', '');
                                        }}
                                        className="btn btn-quiet"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label htmlFor="w-search" className={label}>
                                        Search by name, phone or email <Req />
                                    </label>
                                    <input
                                        id="w-search"
                                        type="search"
                                        autoComplete="off"
                                        className={input}
                                        value={term}
                                        onChange={(e) => setTerm(e.target.value)}
                                        placeholder="e.g. Maria or 0917"
                                    />
                                    {term.trim().length >= 2 && matches.length === 0 && term.trim() === q && (
                                        <p className="mt-2 text-sm text-pw-ink/70">
                                            No customer found.{' '}
                                            <button
                                                type="button"
                                                onClick={() => switchMode('new')}
                                                className="font-semibold text-pw-rust underline"
                                            >
                                                Add a new walk-in customer
                                            </button>
                                        </p>
                                    )}
                                    {matches.length > 0 && (
                                        <ul className="mt-2 divide-y divide-pw-ink/10 overflow-hidden rounded-2xl border border-pw-ink/15 bg-white">
                                            {matches.map((m) => (
                                                <li key={m.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => choose(m)}
                                                        className="flex min-h-11 w-full flex-col items-start px-4 py-2.5 text-left transition hover:bg-pw-ink/5"
                                                    >
                                                        <span className="text-sm font-semibold">{m.name}</span>
                                                        <span className="text-xs text-pw-ink/70">
                                                            {[m.phone, m.email].filter(Boolean).join(' · ') || 'No contact details'}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            )}
                            {err('customer_id')}
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                                <label htmlFor="w-name" className={label}>
                                    Full name <Req />
                                </label>
                                <input
                                    id="w-name"
                                    className={input}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Maria Dela Cruz"
                                />
                                {err('name')}
                            </div>
                            <div>
                                <label htmlFor="w-phone" className={label}>
                                    Contact number <Req />
                                </label>
                                <input
                                    id="w-phone"
                                    type="tel"
                                    inputMode="tel"
                                    maxLength={16}
                                    className={input}
                                    value={data.phone}
                                    onChange={(e) =>
                                        setData('phone', e.target.value.replace(/[^\d+\s-]/g, ''))
                                    }
                                    placeholder="09XX XXX XXXX"
                                />
                                {err('phone')}
                            </div>
                            <p className="text-xs text-pw-ink/70 md:col-span-2">
                                No email needed. This customer has no login, so call or text them when the laundry is ready.
                            </p>
                        </div>
                    )}
                </fieldset>

                {/* 2. laundry */}
                <fieldset className="grid gap-4 md:col-span-2 md:grid-cols-2">
                    <legend className="font-serif text-2xl">2. Laundry</legend>
                    <div>
                        <label htmlFor="w-service" className={label}>
                            Service <Req />
                        </label>
                        <select
                            id="w-service"
                            className={input}
                            value={data.service_id}
                            onChange={(e) => setData('service_id', e.target.value)}
                        >
                            {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({peso(s.price)} / {s.unit})
                                </option>
                            ))}
                        </select>
                        {err('service_id')}
                    </div>
                    <div>
                        <label htmlFor="w-qty" className={label}>
                            Real weight / amount ({svc?.unit ?? 'units'}) <Req />
                        </label>
                        <input
                            id="w-qty"
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0.1"
                            max="200"
                            className={input}
                            value={data.quantity}
                            onChange={(e) => setData('quantity', e.target.value)}
                            placeholder="e.g. 4.6"
                        />
                        {err('quantity')}
                        <p className="mt-1 text-sm font-semibold">
                            {price !== null ? `Total: ${peso(price)}` : 'Enter 0.1 to 200'}
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="w-notes" className={label}>
                            Instructions (optional)
                        </label>
                        <textarea
                            id="w-notes"
                            rows={2}
                            maxLength={500}
                            className={input}
                            value={data.instructions}
                            onChange={(e) => setData('instructions', e.target.value)}
                            placeholder="e.g. No fabric softener"
                        />
                        {err('instructions')}
                    </div>
                </fieldset>

                {/* 3. intake */}
                <fieldset className="grid gap-4 md:col-span-2 md:grid-cols-2">
                    <legend className="font-serif text-2xl">3. What was handed over (recommended)</legend>
                    <p className="text-xs text-pw-ink/70 md:col-span-2">
                        Count the items and note their condition now. It settles lost or damaged item disputes later.
                        The customer can read the count and notes. You can also fill this in later from the orders table.
                    </p>
                    <div>
                        <label htmlFor="w-items" className={label}>
                            Number of items
                        </label>
                        <input
                            id="w-items"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="500"
                            step="1"
                            className={input}
                            value={data.item_count}
                            onChange={(e) => setData('item_count', e.target.value)}
                        />
                        {err('item_count')}
                    </div>
                    <div>
                        <label htmlFor="w-photo" className={label}>
                            Counter photo (optional)
                        </label>
                        <input
                            id="w-photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="mt-1 block w-full text-sm"
                            onChange={(e) => setData('photo', e.target.files?.[0] ?? null)}
                        />
                        {err('photo')}
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="w-inotes" className={label}>
                            Condition notes
                        </label>
                        <textarea
                            id="w-inotes"
                            rows={2}
                            maxLength={500}
                            className={input}
                            value={data.intake_notes}
                            onChange={(e) => setData('intake_notes', e.target.value)}
                            placeholder="e.g. 1 white shirt, small stain on the collar; 1 sock pair"
                        />
                        {err('intake_notes')}
                    </div>
                </fieldset>

                {/* 4. payment + submit */}
                <fieldset className="md:col-span-2">
                    <legend className="font-serif text-2xl">4. Payment</legend>
                    <label className="mt-3 flex min-h-11 items-start gap-3 text-sm">
                        <input
                            type="checkbox"
                            className="mt-1 h-4 w-4"
                            checked={data.paid_now}
                            onChange={(e) => setData('paid_now', e.target.checked)}
                        />
                        <span>
                            The customer paid cash now
                            <span className="block text-xs text-pw-ink/70">
                                Leave this unticked if they pay when they pick the laundry up (it is recorded automatically then).
                            </span>
                        </span>
                    </label>
                    {err('paid_now')}
                </fieldset>

                <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                    <button
                        type="submit"
                        disabled={!ready || processing}
                        className="btn btn-navy"
                    >
                        {processing ? 'Creating…' : 'Create order & open claim slip'}
                    </button>
                    {!ready && (
                        <span className="text-xs text-pw-ink/70">
                            Choose or add the customer and enter the real weight first.
                        </span>
                    )}
                </div>
            </form>
        </Shell>
    );
}
