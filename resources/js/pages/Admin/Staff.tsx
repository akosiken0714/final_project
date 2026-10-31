import Req from '@/components/Req';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import Shell from '@/components/Shell';

const input =
    'mt-1 w-full rounded-xl border border-pw-ink/25 bg-white px-3 py-2 text-sm text-pw-ink outline-none focus:border-pw-ink';
const label = 'text-xs uppercase tracking-[0.18em] text-pw-ink/70';

// A random password the admin can hand to the new person (they can change it in Settings > Security).
function makePassword() {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const symbols = '!@#$%&*?';
    const bytes = crypto.getRandomValues(new Uint32Array(14));
    const body = Array.from(bytes, (n) => chars[n % chars.length]).join('');
    return body + symbols[bytes[0] % symbols.length] + ((bytes[1] % 90) + 10);
}

type Person = { id: number; name: string; email: string | null; phone: string | null };

// Admin only. Staff are the counter team (cashiers): they run the order desk and take walk-in orders,
// but never see revenue, analytics, history or prices, and they can't delete accounts.
export default function Staff({ staff = [] }: { staff: Person[] }) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        admin_password: '',
    });

    const err = (k: keyof typeof errors) =>
        errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/staff', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    const suggest = () => {
        const pw = makePassword();
        setData((d) => ({ ...d, password: pw, password_confirmation: pw }));
    };

    const revoke = (p: Person) => {
        const pw = prompt(
            `Remove staff access from ${p.name}? They stay as a normal customer account.\n\nType YOUR admin password to confirm:`,
        );
        if (!pw) return;
        router.delete(`/admin/staff/${p.id}`, {
            data: { admin_password: pw },
            preserveScroll: true,
            onError: (er) => alert(Object.values(er)[0]),
        });
    };

    return (
        <Shell>
            <Head title="Staff" />
            <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">Admin</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <h1 className="font-serif text-4xl md:text-5xl">
                    Our <span className="text-pw-peach italic">staff</span>
                </h1>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="btn btn-peach"
                >
                    {open ? 'Close' : '+ Add staff'}
                </button>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-pw-cream/70">
                Staff (cashiers) can update orders, weigh laundry, record payment and intake, take walk-in orders and
                cancel unpaid orders. They cannot see revenue or analytics, history, prices or the customer list,
                cancel paid orders, or delete accounts.
            </p>

            {open && (
                <form
                    onSubmit={submit}
                    className="mt-8 grid gap-4 rounded-3xl bg-pw-cream p-6 text-pw-ink shadow-xl md:grid-cols-2"
                >
                    <p className="text-xs text-pw-ink/70 md:col-span-2">
                        <span className="font-semibold text-red-600">*</span> required
                    </p>
                    <div>
                        <label htmlFor="s-name" className={label}>
                            Full name <Req />
                        </label>
                        <input
                            id="s-name"
                            className={input}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        {err('name')}
                    </div>
                    <div>
                        <label htmlFor="s-email" className={label}>
                            Email (their login) <Req />
                        </label>
                        <input
                            id="s-email"
                            type="email"
                            className={input}
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        {err('email')}
                    </div>
                    <div>
                        <label htmlFor="s-phone" className={label}>
                            Contact number
                        </label>
                        <input
                            id="s-phone"
                            type="tel"
                            inputMode="tel"
                            maxLength={16}
                            placeholder="09XX XXX XXXX"
                            className={input}
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value.replace(/[^\d+\s-]/g, ''))}
                        />
                        {err('phone')}
                    </div>
                    <div />
                    <div>
                        <label htmlFor="s-pw" className={label}>
                            Password <Req />
                        </label>
                        <input
                            id="s-pw"
                            type="text"
                            autoComplete="off"
                            className={input}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                        {err('password')}
                        <button
                            type="button"
                            onClick={suggest}
                            className="mt-1 text-sm font-semibold text-pw-rust hover:underline"
                        >
                            Generate a strong one
                        </button>
                    </div>
                    <div>
                        <label htmlFor="s-pw2" className={label}>
                            Repeat password <Req />
                        </label>
                        <input
                            id="s-pw2"
                            type="text"
                            autoComplete="off"
                            className={input}
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                    </div>
                    <div className="border-t border-dashed border-pw-ink/25 pt-4 md:col-span-2">
                        <label htmlFor="s-admin" className={label}>
                            Your admin password (to confirm) <Req />
                        </label>
                        <input
                            id="s-admin"
                            type="password"
                            autoComplete="current-password"
                            className={input}
                            value={data.admin_password}
                            onChange={(e) => setData('admin_password', e.target.value)}
                            required
                        />
                        {err('admin_password')}
                    </div>
                    <div className="md:col-span-2">
                        <button
                            disabled={processing}
                            className="btn btn-navy"
                        >
                            {processing ? 'Creating…' : 'Create staff account'}
                        </button>
                    </div>
                </form>
            )}

            <div className="mt-8 grid gap-5 md:grid-cols-2">
                {staff.map((p) => (
                    <div
                        key={p.id}
                        className="rounded-3xl bg-pw-cream p-6 text-pw-ink shadow-xl"
                    >
                        <h3 className="truncate font-serif text-2xl">
                            {p.name}
                            <span className="ml-2 rounded-full bg-pw-steel/25 px-2 py-0.5 align-middle text-xs tracking-widest text-pw-deep uppercase">
                                Staff
                            </span>
                        </h3>
                        <p className="truncate text-sm text-pw-ink/70">{p.email}</p>
                        <p className="mt-2 text-sm">{p.phone || 'No contact number'}</p>
                        <button
                            type="button"
                            onClick={() => revoke(p)}
                            className="btn btn-quiet mt-3 text-pw-danger"
                        >
                            Remove staff access
                        </button>
                    </div>
                ))}
                {staff.length === 0 && (
                    <p className="text-pw-cream/60">
                        No staff yet. Add your first cashier with the button above.
                    </p>
                )}
            </div>
        </Shell>
    );
}
