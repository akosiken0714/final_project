import { Head, Link } from '@inertiajs/react';
import { peso } from '@/lib/delivery';

// Printable receipt / claim slip for one order. Opened from "Receipt" on an order card (customer) or row (admin).
// Drawn for paper: dark text on white, prints on A5 or saves as a PDF. The shop name and address below are plain text;
// keep them in step with SHOP in welcome.tsx.
const SHOP_NAME = 'PhineWash Laundry Services';
const SHOP_ADDRESS = 'Poblacion, Anahawan, Southern Leyte';

const PRINT_CSS = `
@media print {
  @page { size: A5; margin: 10mm; }
  html, body { background: #fff !important; }
  .pw-noprint { display: none !important; }
  .pw-slip { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; max-width: none !important; }
}
.pw-slip, .pw-slip * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

const tag = (id: number) => '#' + String(id).padStart(4, '0');

const when = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('en-PH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : '';

const dayOnly = (ymd: string) =>
    new Date(ymd + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

function Line({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 py-1 text-sm">
            <span className="text-pw-ink/70">{label}</span>
            <span className="text-right font-medium">{value}</span>
        </div>
    );
}

export default function Receipt({
    order,
    service,
    customer,
    backUrl,
}: {
    order: any;
    service: { name: string | null; unit: string | null; price: number | null };
    customer: { name: string | null; phone: string | null };
    backUrl: string;
}) {
    const dropoff = order.fulfillment === 'dropoff';
    const paid = order.payment_status === 'paid';
    const method = order.payment_method === 'gcash' ? 'GCash' : 'Cash';
    const hasFee = Number(order.delivery_fee) > 0;

    return (
        <div className="min-h-screen bg-pw-linen px-4 py-8 text-pw-ink">
            <Head title={`Receipt ${tag(order.id)}`} />
            <style>{PRINT_CSS}</style>

            <div className="pw-noprint mx-auto mb-5 flex max-w-md items-center justify-between gap-3">
                <Link
                    href={backUrl}
                    className="text-sm font-semibold text-pw-rust hover:underline"
                >
                    ← Back
                </Link>
                <button
                    onClick={() => window.print()}
                    className="rounded-full bg-pw-ink px-5 py-2 text-sm font-semibold text-pw-cream transition hover:bg-pw-rust"
                >
                    Print / Save as PDF
                </button>
            </div>

            <article className="pw-slip mx-auto max-w-md rounded-3xl bg-white p-7 shadow-xl">
                <header className="border-b-2 border-dashed border-pw-ink/30 pb-4 text-center">
                    <p className="font-serif text-2xl">{SHOP_NAME}</p>
                    <p className="mt-1 text-xs text-pw-ink/70">
                        {SHOP_ADDRESS}
                    </p>
                </header>

                <div className="py-5 text-center">
                    <p className="text-xs tracking-[0.3em] text-pw-ink/70 uppercase">
                        Claim slip
                    </p>
                    <p className="mt-1 font-sans text-5xl font-semibold tracking-tight tabular-nums">
                        {tag(order.id)}
                    </p>
                    <p className="mt-2 text-xs text-pw-ink/70">
                        {dropoff
                            ? 'Show this slip when you pick up your laundry.'
                            : 'Keep this slip. Our rider will confirm your order number.'}
                    </p>
                </div>

                <section className="border-t border-dashed border-pw-ink/30 py-3">
                    <Line label="Placed" value={when(order.created_at)} />
                    <Line label="Customer" value={customer.name ?? 'Customer'} />
                    {customer.phone && (
                        <Line label="Phone" value={customer.phone} />
                    )}
                    <Line label="Status" value={order.status} />
                    <Line
                        label="Handover"
                        value={dropoff ? 'Drop-off at the shop' : 'Pickup & delivery'}
                    />
                    {order.pickup_date && (
                        <Line
                            label={dropoff ? 'Drop-off day' : 'Pickup day'}
                            value={`${dayOnly(order.pickup_date)}${order.pickup_slot ? `, ${order.pickup_slot}` : ''}`}
                        />
                    )}
                    {!dropoff && order.address && (
                        <Line label="Address" value={order.address} />
                    )}
                </section>

                <section className="border-t border-dashed border-pw-ink/30 py-3">
                    <Line
                        label={`${service.name ?? 'Service'} x ${order.quantity}${service.unit ? ` ${service.unit}` : ''}`}
                        value={peso(order.total)}
                    />
                    {order.items_received != null && (
                        <p className="-mt-0.5 text-xs text-pw-ink/70">
                            {order.items_received}{' '}
                            {order.items_received === 1 ? 'item' : 'items'} received at the counter
                        </p>
                    )}
                    {service.price !== null && (
                        <p className="-mt-0.5 text-xs text-pw-ink/70">
                            at {peso(service.price)} each
                        </p>
                    )}
                    {hasFee && (
                        <Line
                            label="Delivery fee"
                            value={peso(order.delivery_fee)}
                        />
                    )}
                    <div className="mt-2 flex items-baseline justify-between border-t border-pw-ink/30 pt-2">
                        <span className="text-xs tracking-[0.18em] uppercase">
                            Total
                        </span>
                        <span className="font-serif text-3xl">
                            {peso(order.amount_due)}
                        </span>
                    </div>
                </section>

                <section className="border-t border-dashed border-pw-ink/30 pt-3">
                    <Line label="Payment" value={method} />
                    <Line
                        label="Paid"
                        value={
                            paid
                                ? `Yes${order.paid_at ? ` (${when(order.paid_at)})` : ''}`
                                : `Not yet. ${method === 'Cash' ? 'Pay when you get your laundry.' : 'Pay in the app.'}`
                        }
                    />
                    {paid && order.payment_reference && (
                        <Line label="Reference" value={order.payment_reference} />
                    )}
                    {order.instructions && (
                        <Line label="Notes" value={order.instructions} />
                    )}
                </section>

                <p className="mt-5 text-center text-xs text-pw-ink/70">
                    Thank you for choosing {SHOP_NAME}!
                </p>
            </article>
        </div>
    );
}
