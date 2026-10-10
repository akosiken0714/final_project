const colors: Record<string, string> = {
    Pending: 'bg-[#0F1E2B]/10 text-[#0F1E2B]',
    'In Progress': 'bg-[#5C8CA8]/25 text-[#1f4a63]',
    'Ready for Pickup': 'bg-[#F0A98B] text-[#0F1E2B]',
    'Out for Delivery': 'bg-[#5C8CA8]/25 text-[#1f4a63]',
    Completed: 'border border-[#0F1E2B]/25 text-[#0F1E2B]/70',
};

export default function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={`inline-block rounded-full px-4 py-1 text-xs font-semibold whitespace-nowrap ${colors[status] ?? colors['Pending']}`}
        >
            {status}
        </span>
    );
}
