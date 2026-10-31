// A status pill with a small dot. The dot is another clue besides color, and "washing" pulses gently.
const styles: Record<string, { pill: string; dot: string }> = {
    Pending: {
        pill: 'bg-pw-ink/10 text-pw-ink',
        dot: 'bg-pw-ink/50',
    },
    'In Progress': {
        pill: 'bg-pw-steel/25 text-pw-deep',
        dot: 'bg-pw-deep motion-safe:animate-pulse',
    },
    'Ready for Pickup': {
        pill: 'bg-pw-peach text-pw-ink',
        dot: 'bg-pw-ink',
    },
    'Out for Delivery': {
        pill: 'bg-pw-steel/25 text-pw-deep',
        dot: 'bg-pw-deep motion-safe:animate-pulse',
    },
    Cancelled: {
        pill: 'border border-pw-rust/40 text-pw-rust',
        dot: 'bg-pw-rust/70',
    },
    Completed: {
        pill: 'border border-pw-ink/25 text-pw-ink/70',
        dot: 'bg-pw-ink/40',
    },
};

export default function StatusBadge({ status }: { status: string }) {
    const look = styles[status] ?? styles['Pending'];

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap ${look.pill}`}
        >
            <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${look.dot}`}
            />
            {status}
        </span>
    );
}