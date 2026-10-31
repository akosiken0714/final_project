// "GCash · Paid" / "Cash · Unpaid" chip, used on the customer's cards and the admin table.
export default function PaymentBadge({ order }: { order: any }) {
    const paid = order.payment_status === 'paid';
    const method = order.payment_method === 'gcash' ? 'GCash' : 'Cash';

    return (
        <span
            className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap ${
                paid
                    ? 'bg-pw-ok/15 text-pw-ok-deep'
                    : 'bg-pw-clay/15 text-pw-rust'
            }`}
        >
            {method} · {paid ? 'Paid' : 'Unpaid'}
        </span>
    );
}
