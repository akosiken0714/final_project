import Req from '@/components/Req';
import { Head, Link, useForm } from '@inertiajs/react';
import Shell from '@/components/Shell';
import { peso } from '@/lib/delivery';

const tag = (id: number) => '#' + String(id).padStart(4, '0');

export default function Pay({
    order,
    demo,
    demoCode,
}: {
    order: any;
    demo: boolean;
    demoCode: string | null;
}) {
    const { data, setData, post, processing, errors } = useForm({
        gcash_number: '',
        code: '',
    });
    const paid = order.payment_status === 'paid';
    const ready =
        /^09\d{9}$/.test(data.gcash_number) && /^\d{6}$/.test(data.code);

    const label = 'text-xs uppercase tracking-[0.18em] text-pw-ink/70';
    const field =
        'mt-1 w-full border-0 border-b border-pw-ink/30 bg-transparent px-0 py-2 text-base text-pw-ink outline-none transition focus:border-pw-ink focus:shadow-[0_1px_0_0_#F0A98B]';
    const err = (k: keyof typeof errors) =>
        errors[k] && <p className="mt-1 text-sm text-red-600">{errors[k]}</p>;

    return (
        <Shell>
            <Head title={paid ? 'Receipt' : 'Pay with GCash'} />
            <div className="text-center">
                <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                    {paid ? 'Thank you' : 'Almost done'}
                </p>
                <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                    {paid ? (
                        <>
                            Payment{' '}
                            <span className="text-pw-peach italic">
                                received
                            </span>
                        </>
                    ) : (
                        <>
                            Pay with{' '}
                            <span className="text-pw-peach italic">GCash</span>
                        </>
                    )}
                </h1>
            </div>

            <div className="mx-auto mt-10 max-w-md rounded-[2rem] bg-pw-cream p-8 text-pw-ink shadow-2xl ring-1 shadow-black/40 ring-pw-ink/5">
                {demo && (
                    <p className="mb-5 rounded-xl bg-pw-peach/30 px-3 py-2 text-center text-xs font-semibold tracking-widest uppercase">
                        Demo mode · no real money moves
                    </p>
                )}

                <div className="flex items-start justify-between">
                    <div>
                        <p className={label}>Order tag</p>
                        <p className="font-serif text-3xl">{tag(order.id)}</p>
                    </div>
                    <p className="text-right text-sm text-pw-ink/70">
                        {order.service?.name}
                        <br />
                        {Number(order.quantity)} {order.service?.unit}
                    </p>
                </div>

                <div className="mt-5 space-y-1 border-t border-dashed border-pw-ink/25 pt-4 text-sm text-pw-ink/70">
                    <div className="flex justify-between">
                        <span>Laundry</span>
                        <span>{peso(order.total)}</span>
                    </div>
                    {order.fulfillment === 'delivery' && (
                        <div className="flex justify-between">
                            <span>Delivery fee</span>
                            <span>{peso(order.delivery_fee)}</span>
                        </div>
                    )}
                    <div className="flex items-end justify-between pt-2 text-pw-ink">
                        <span className={label}>Amount due</span>
                        <span className="font-serif text-4xl">
                            {peso(order.amount_due)}
                        </span>
                    </div>
                </div>

                {paid ? (
                    <div className="mt-6 rounded-2xl bg-pw-ok/10 p-4 text-sm text-pw-ok-deep">
                        <p className="font-semibold">Paid with GCash</p>
                        <p>
                            Reference:{' '}
                            <span className="font-mono">
                                {order.payment_reference}
                            </span>
                        </p>
                        {order.paid_at && (
                            <p>
                                {new Date(order.paid_at).toLocaleString(
                                    'en-PH',
                                )}
                            </p>
                        )}
                        <p className="mt-2 text-xs">
                            Keep this reference. The shop can look it up if you
                            need to verify.
                        </p>
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (ready && !processing)
                                post(`/orders/${order.id}/pay`);
                        }}
                        className="mt-6 grid gap-5"
                    >
                        <div>
                            <label htmlFor="gcash_number" className={label}>
                                GCash number <Req />
                            </label>
                            <input
                                id="gcash_number"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                placeholder="09XXXXXXXXX"
                                maxLength={11}
                                className={field}
                                value={data.gcash_number}
                                onChange={(e) =>
                                    setData(
                                        'gcash_number',
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 11),
                                    )
                                }
                            />
                            {err('gcash_number')}
                        </div>
                        <div>
                            <label htmlFor="code" className={label}>
                                6-digit code <Req />
                            </label>
                            <input
                                id="code"
                                type="password"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                className={field}
                                value={data.code}
                                onChange={(e) =>
                                    setData(
                                        'code',
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 6),
                                    )
                                }
                            />
                            {demoCode && (
                                <p className="mt-1 text-xs text-pw-ink/70">
                                    Demo code:{' '}
                                    <span className="font-mono font-semibold">
                                        {demoCode}
                                    </span>
                                </p>
                            )}
                            {err('code')}
                        </div>
                        <button
                            disabled={!ready || processing}
                            className="w-full rounded-full bg-pw-ink px-8 py-3 font-semibold text-pw-cream transition hover:-translate-y-0.5 hover:bg-pw-peach hover:text-pw-ink disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing
                                ? 'Paying…'
                                : `Pay ${peso(order.amount_due)}`}
                        </button>
                    </form>
                )}

                <div className="mt-5 text-center">
                    <Link
                        href="/orders"
                        className="text-sm font-semibold text-pw-rust hover:underline"
                    >
                        {paid ? 'Back to my orders' : 'Pay later'}
                    </Link>
                </div>
            </div>
        </Shell>
    );
}
