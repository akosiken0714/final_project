import Req from '@/components/Req';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import Shell from '@/components/Shell';
import UserAvatar from '@/components/UserAvatar';

const input = 'mt-1 w-full rounded-xl border border-[#0F1E2B]/25 bg-white px-3 py-2 text-sm text-[#0F1E2B] outline-none focus:border-[#0F1E2B]';
const label = 'text-[10px] uppercase tracking-[0.25em] text-[#0F1E2B]/55';

// A random password the admin can hand to the new person (they can change it in Settings > Security).
function makePassword() {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const symbols = '!@#$%&*?';
    const bytes = crypto.getRandomValues(new Uint32Array(14));
    const body = Array.from(bytes, (n) => chars[n % chars.length]).join('');
    return body + symbols[bytes[0] % symbols.length] + (bytes[1] % 90 + 10);
}

export default function Customers({
    customers,
    search = '',
    totals,
}: {
    customers: any[];
    search?: string;
    totals?: { customers: number; admins: number };
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState(search);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', email: '', phone: '', address: '', role: 'customer',
        password: '', password_confirmation: '', admin_password: '',
    });

    const err = (k: keyof typeof errors) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post('/admin/users', {
            preserveScroll: true,
            onSuccess: () => { reset(); setOpen(false); },
        });
    };

    const suggest = () => {
        const pw = makePassword();
        setData((d) => ({ ...d, password: pw, password_confirmation: pw }));
    };

    const find = (e: FormEvent) => {
        e.preventDefault();
        router.get('/admin/customers', q.trim() ? { q: q.trim() } : {}, { preserveState: true, replace: true });
    };

    return (
        <Shell>
            <Head title="People" />
            <p className=" text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Admin</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <h1 className=" font-serif text-5xl md:text-6xl">
                    Our <span className="italic text-[#F0A98B]">customers</span>
                </h1>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="rounded-full bg-[#F0A98B] px-6 py-2.5 text-sm font-semibold text-[#0B1F26] transition hover:-translate-y-0.5 hover:bg-[#F7F1E8]"
                >
                    {open ? 'Close' : '+ Add a person'}
                </button>
            </div>
            {totals && (
                <p className="mt-3 text-sm text-[#F7F1E8]/60">{totals.customers} customers · {totals.admins} admins</p>
            )}

            {open && (
                <form onSubmit={submit} className="mt-8 grid gap-4 rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl md:grid-cols-2">
                    <p className="md:col-span-2 text-xs text-[#0F1E2B]/55"><span className="font-semibold text-red-600">*</span> required</p>
                    <div className="md:col-span-2">
                        <p className="font-serif text-2xl">New account</p>
                        <p className="text-xs text-[#0F1E2B]/60">Great for walk-in customers. They can add a picture and their usual spot in Settings after they log in.</p>
                    </div>

                    <div>
                        <label htmlFor="u-name" className={label}>Full name <Req /></label>
                        <input id="u-name" className={input} value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        {err('name')}
                    </div>
                    <div>
                        <label htmlFor="u-email" className={label}>Email <Req /></label>
                        <input id="u-email" type="email" className={input} value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                        {err('email')}
                    </div>
                    <div>
                        <label htmlFor="u-phone" className={label}>Contact number</label>
                        <input id="u-phone" type="tel" inputMode="tel" maxLength={16} placeholder="09XX XXX XXXX" className={input} value={data.phone} onChange={(e) => setData('phone', e.target.value.replace(/[^\d+\s-]/g, ''))} />
                        {err('phone')}
                    </div>
                    <div>
                        <label htmlFor="u-role" className={label}>Account type <Req /></label>
                        <select id="u-role" className={input} value={data.role} onChange={(e) => setData('role', e.target.value)}>
                            <option value="customer">Customer</option>
                            <option value="admin">Admin (full access)</option>
                        </select>
                        {err('role')}
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="u-address" className={label}>Address (optional)</label>
                        <input id="u-address" className={input} value={data.address} onChange={(e) => setData('address', e.target.value)} />
                        {err('address')}
                    </div>
                    <div>
                        <label htmlFor="u-pw" className={label}>Password <Req /></label>
                        <input id="u-pw" type="text" autoComplete="off" className={input} value={data.password} onChange={(e) => setData('password', e.target.value)} required />
                        {err('password')}
                        <button type="button" onClick={suggest} className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#C96F48] hover:underline">Generate a strong one</button>
                    </div>
                    <div>
                        <label htmlFor="u-pw2" className={label}>Repeat password <Req /></label>
                        <input id="u-pw2" type="text" autoComplete="off" className={input} value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} required />
                    </div>
                    <div className="md:col-span-2 border-t border-dashed border-[#0F1E2B]/25 pt-4">
                        <label htmlFor="u-admin" className={label}>Your admin password (to confirm) <Req /></label>
                        <input id="u-admin" type="password" autoComplete="current-password" className={input} value={data.admin_password} onChange={(e) => setData('admin_password', e.target.value)} required />
                        {err('admin_password')}
                    </div>
                    <div className="md:col-span-2">
                        <button disabled={processing} className="rounded-full bg-[#0F1E2B] px-8 py-3 text-sm font-semibold text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B] disabled:opacity-50">
                            {processing ? 'Creating…' : 'Create account'}
                        </button>
                    </div>
                </form>
            )}

            <form onSubmit={find} className="mt-8 flex max-w-md gap-2">
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name, email or number"
                    aria-label="Search people"
                    className="w-full rounded-full border border-[#F7F1E8]/25 bg-transparent px-4 py-2 text-sm text-[#F7F1E8] placeholder:text-[#F7F1E8]/40 outline-none focus:border-[#F0A98B]"
                />
                <button className="rounded-full border border-[#F7F1E8]/25 px-5 text-sm transition hover:bg-[#F0A98B] hover:text-[#0B1F26]">Search</button>
            </form>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
                {customers.map((c) => (
                    <div key={c.id} className=" rounded-3xl bg-[#F7F1E8] p-6 text-[#0F1E2B] shadow-xl transition hover:-translate-y-1">
                        <div className="flex items-center gap-4">
                            <span className="text-[#0F1E2B]"><UserAvatar user={c} size={52} /></span>
                            <div className="min-w-0">
                                <h3 className="truncate font-serif text-2xl">
                                    {c.name}
                                    {c.role === 'admin' && <span className="ml-2 rounded-full bg-[#0F1E2B] px-2 py-0.5 align-middle text-[10px] uppercase tracking-widest text-[#F7F1E8]">Admin</span>}
                                </h3>
                                <p className="truncate text-sm text-[#0F1E2B]/60">{c.email}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm">{c.phone || 'No contact'} · {c.address || 'No address'}</p>
                        <p className="mt-4 border-t border-dashed border-[#0F1E2B]/25 pt-3 text-[10px] uppercase tracking-[0.25em] text-[#C96F48]">{c.orders_count} orders</p>
                    </div>
                ))}
                {customers.length === 0 && <p className="text-[#F7F1E8]/60">No one matches that search.</p>}
            </div>
        </Shell>
    );
}
