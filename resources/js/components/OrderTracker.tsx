// A labeled progress tracker for one order: the current step is named in words, not just colored.
// The dots also differ in shape (check = done, ring = now, empty = next), so it works without color.

const LABEL: Record<string, string> = {
    Pending: 'Received',
    'In Progress': 'Washing',
    'Ready for Pickup': 'Ready',
    'Out for Delivery': 'On the way',
    Completed: 'Done',
};

export default function OrderTracker({
    steps,
    status,
}: {
    steps: string[];
    status: string;
}) {
    const current = Math.max(0, steps.indexOf(status));

    return (
        <ol className="mt-5 flex items-start" aria-label="Order progress">
            {steps.map((s, i) => {
                const done = i < current;
                const now = i === current;

                return (
                    <li
                        key={s}
                        aria-current={now ? 'step' : undefined}
                        className="relative flex flex-1 flex-col items-center text-center"
                    >
                        {i > 0 && (
                            <span
                                aria-hidden="true"
                                className={`absolute top-[9px] right-1/2 h-0.5 w-full transition-colors duration-200 ${i <= current ? 'bg-pw-peach' : 'bg-pw-ink/15'}`}
                            />
                        )}
                        <span
                            aria-hidden="true"
                            className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                                done
                                    ? 'border-pw-peach bg-pw-peach'
                                    : now
                                      ? 'border-pw-ink bg-pw-cream'
                                      : 'border-pw-ink/50 bg-pw-cream'
                            }`}
                        >
                            {done && (
                                <svg
                                    viewBox="0 0 12 12"
                                    className="h-3 w-3 text-pw-ink"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M2.5 6.5 5 9l4.5-5.5" />
                                </svg>
                            )}
                            {now && (
                                <span className="h-2 w-2 rounded-full bg-pw-peach" />
                            )}
                        </span>
                        <span
                            className={`mt-1.5 px-0.5 text-xs leading-tight ${
                                now
                                    ? 'font-semibold text-pw-ink'
                                    : done
                                      ? 'text-pw-ink/80'
                                      : 'text-pw-ink/70'
                            }`}
                        >
                            {LABEL[s] ?? s}
                            <span className="sr-only">
                                {done
                                    ? ' (done)'
                                    : now
                                      ? ' (current step)'
                                      : ' (next)'}
                            </span>
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}
