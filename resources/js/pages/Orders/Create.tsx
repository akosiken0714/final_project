import { useForm, Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Shell from '@/components/Shell';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 4;
const fmt = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

export default function Create({ services }: { services: any[] }) {
    const { auth }: any = usePage().props;
    const q = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

    const { data, setData, post, processing, errors } = useForm<any>({
        service_id: q.get('service') ?? '',
        quantity: q.get('quantity') ?? '1',
        address: auth?.user?.address ?? '',
        instructions: '',
        photo: null,
        photo_confirmed: false,
    });

    const [photoError, setPhotoError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const preview = useMemo(() => (data.photo ? URL.createObjectURL(data.photo) : null), [data.photo]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const picked = services.find((s) => s.id == data.service_id);
    const qty = parseInt(data.quantity, 10) || 0;
    const total = picked ? picked.price * qty : 0;
    const locked = processing || qty < 1 || (!!data.photo && !data.photo_confirmed);

    const clear = () => {
        setData((d: any) => ({ ...d, photo: null, photo_confirmed: false }));
        if (fileRef.current) fileRef.current.value = '';
    };

    const choose = (f?: File | null) => {
        setPhotoError('');
        if (!f) return;
        if (!ALLOWED.includes(f.type)) { setPhotoError('Please choose a JPG, PNG or WebP photo.'); clear(); return; }
        if (f.size > MAX_MB * 1024 * 1024) { setPhotoError(`That photo is ${fmt(f.size)}. Please keep it under ${MAX_MB} MB.`); clear(); return; }
        setData((d: any) => ({ ...d, photo: f, photo_confirmed: false }));
    };

    const label = 'text-[10px] uppercase tracking-[0.25em] text-[#0F1E2B]/55';
    const field = 'mt-1 w-full border-0 border-b border-[#0F1E2B]/30 bg-transparent px-0 py-2 text-base text-[#0F1E2B] outline-none transition focus:border-[#0F1E2B] focus:shadow-[0_1px_0_0_#F0A98B]';
    const err = (k: string) => errors[k] && <p className="mt-1 text-sm text-red-600">{errors[k]}</p>;

    return (
        <Shell>
            <Head title="New Order" />
            <div className="text-center">
                <p className="rise text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Book a wash</p>
                <h1 className="rise mt-3 font-serif text-5xl md:text-6xl" style={{ animationDelay: '.1s' }}>
                    New <span className="italic text-[#F0A98B]">order</span>
                </h1>
            </div>

            <div className="hang mx-auto mt-10 flex max-w-xl flex-col items-center">
                <div className="z-10 h-10 w-3 rounded-sm bg-[#F0A98B] shadow-md shadow-black/30" />
                <div className="-mt-1 h-8 w-px bg-[#F7F1E8]/40" />

                <form
                    onSubmit={(e) => { e.preventDefault(); if (!locked) post('/orders', { forceFormData: true }); }}
                    className="grid w-full gap-6 rounded-[2rem] bg-[#F7F1E8] p-8 text-[#0F1E2B] shadow-2xl shadow-black/40 ring-1 ring-[#0F1E2B]/5"
                >
                    <div className="mx-auto h-4 w-4 rounded-full border-2 border-[#0F1E2B]/40" />

                    <div>
                        <label htmlFor="service" className={label}>Service</label>
                        <select id="service" className={field} value={data.service_id} onChange={(e) => setData('service_id', e.target.value)}>
                            <option value="">Choose a service</option>
                            {services.map((s) => <option key={s.id} value={s.id}>{s.name} — ₱{s.price}/{s.unit}</option>)}
                        </select>
                        {err('service_id')}
                    </div>

                    <div>
                        <label htmlFor="quantity" className={label}>Kilos / loads (whole numbers)</label>
                        <input
                            id="quantity" type="number" inputMode="numeric" step="1" min="1" max="100" className={field}
                            value={data.quantity} onChange={(e) => setData('quantity', e.target.value.replace(/\D/g, ''))}
                        />
                        {err('quantity')}
                    </div>

                    <div>
                        <label htmlFor="address" className={label}>Pickup / delivery address</label>
                        <input id="address" type="text" autoComplete="street-address" placeholder="House no., street, barangay, city" className={field}
                            value={data.address} onChange={(e) => setData('address', e.target.value)} />
                        {err('address')}
                    </div>

                    <div>
                        <label htmlFor="instructions" className={label}>Special instructions</label>
                        <textarea id="instructions" rows={3} className={`${field} resize-none`} value={data.instructions} onChange={(e) => setData('instructions', e.target.value)} />
                        {err('instructions')}
                    </div>

                    <div>
                        <label htmlFor="photo" className={label}>Photo of items (optional)</label>
                        {!data.photo && (
                            <input
                                id="photo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                                className={`${field} text-sm`} onChange={(e) => choose(e.target.files?.[0])}
                            />
                        )}
                        {photoError && <p className="mt-1 text-sm text-red-600">{photoError}</p>}
                        {err('photo')}

                        {data.photo && preview && (
                            <div className="mt-3 rounded-2xl border border-dashed border-[#0F1E2B]/25 p-3">
                                <div className="flex items-center gap-4">
                                    <img src={preview} alt="Selected laundry photo" className="h-20 w-20 rounded-xl object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{data.photo.name}</p>
                                        <p className="text-xs text-[#0F1E2B]/60">{fmt(data.photo.size)}</p>
                                        <button type="button" onClick={clear} className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#C96F48] hover:underline">
                                            Remove / Choose another
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-[#0F1E2B]/60">Only send photos of your laundry. Don't include faces, documents or your home.</p>
                                <label htmlFor="photo_confirmed" className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                                    <input id="photo_confirmed" type="checkbox" className="h-4 w-4 accent-[#F0A98B]"
                                        checked={data.photo_confirmed} onChange={(e) => setData('photo_confirmed', e.target.checked)} />
                                    I've checked this photo.
                                </label>
                                {err('photo_confirmed')}
                            </div>
                        )}
                    </div>

                    <div className="flex items-end justify-between border-t border-dashed border-[#0F1E2B]/25 pt-5">
                        <span className="text-[10px] uppercase tracking-widest text-[#0F1E2B]/50">Total</span>
                        <span className="font-serif text-4xl">₱{total.toFixed(2)}</span>
                    </div>

                    <button
                        disabled={locked}
                        className="w-full rounded-full bg-[#0F1E2B] px-8 py-3 font-semibold text-[#F7F1E8] transition hover:-translate-y-0.5 hover:bg-[#F0A98B] hover:text-[#0F1E2B] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {processing ? 'Sending...' : 'Submit order'}
                    </button>
                </form>
            </div>
        </Shell>
    );
}