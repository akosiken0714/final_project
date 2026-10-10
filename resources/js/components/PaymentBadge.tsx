// "GCash · Paid" / "Cash · Unpaid" chip, used on the customer's cards and the admin table.
export default function PaymentBadge({ order }: { order: any }) {
    const paid = order.payment_status === 'paid';
    const method = order.payment_method === 'gcash' ? 'GCash' : 'Cash';

    return (
        <span
            className={`inline-block whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold ${
                paid ? 'bg-[#2f7d5b]/15 text-[#1f5a40]' : 'bg-[#C96F48]/15 text-[#A5532F]'
            }`}
        >
            {method} · {paid ? 'Paid' : 'Unpaid'}
        </span>
    );
}
