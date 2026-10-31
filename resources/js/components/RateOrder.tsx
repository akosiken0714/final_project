import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type Rating = { stars: number; comment: string | null } | null | undefined;

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const MAX = 500;

// Filled and empty stars, with the number for screen readers.
export function Stars({
    value,
    className = 'text-base',
}: {
    value: number;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex tracking-tight text-pw-warn ${className}`}
            role="img"
            aria-label={`${value} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} aria-hidden="true">
                    {n <= Math.round(value) ? '★' : '☆'}
                </span>
            ))}
        </span>
    );
}

// "Rate this order": 1 to 5 stars and one optional comment. Works for finished orders only.
export default function RateOrder({
    order,
}: {
    order: { id: number; rating?: Rating };
}) {
    const saved = order.rating ?? null;
    const [open, setOpen] = useState(false);
    const [stars, setStars] = useState(saved?.stars ?? 0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState(saved?.comment ?? '');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const toggle = (next: boolean) => {
        if (next) {
            // start from what was saved last time
            setStars(saved?.stars ?? 0);
            setComment(saved?.comment ?? '');
            setHover(0);
            setError('');
        }
        setOpen(next);
    };

    const shown = hover || stars;

    const submit = () => {
        if (stars < 1) {
            setError('Please tap a star first.');
            return;
        }
        router.post(
            `/orders/${order.id}/rating`,
            { stars, comment },
            {
                preserveScroll: true,
                onStart: () => setBusy(true),
                onFinish: () => setBusy(false),
                onSuccess: () => setOpen(false),
                onError: (er) =>
                    setError(
                        String(Object.values(er)[0] ?? 'Something went wrong.'),
                    ),
            },
        );
    };

    return (
        <>
            <button
                onClick={() => toggle(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-pw-rust hover:underline"
            >
                {saved ? (
                    <>
                        <Stars value={saved.stars} className="text-sm" />
                        Edit
                    </>
                ) : (
                    'Rate'
                )}
            </button>

            <Dialog open={open} onOpenChange={toggle}>
                <DialogContent className="max-w-md border-pw-ink/10 bg-pw-cream text-pw-ink">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">
                            How was order #{String(order.id).padStart(4, '0')}?
                        </DialogTitle>
                        <DialogDescription className="text-pw-ink/70">
                            Your rating helps the shop keep doing what works and
                            fix what doesn't.
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        role="radiogroup"
                        aria-label="Your rating"
                        className="flex items-center justify-center gap-1"
                        onMouseLeave={() => setHover(0)}
                    >
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={stars === n}
                                aria-label={`${n} ${n === 1 ? 'star' : 'stars'}: ${WORDS[n]}`}
                                onMouseEnter={() => setHover(n)}
                                onClick={() => {
                                    setStars(n);
                                    setError('');
                                }}
                                className={`p-1 text-4xl leading-none transition-transform hover:scale-110 ${n <= shown ? 'text-pw-warn' : 'text-pw-ink/25'}`}
                            >
                                {n <= shown ? '★' : '☆'}
                            </button>
                        ))}
                    </div>
                    <p className="-mt-2 h-5 text-center text-sm font-semibold text-pw-ink/70">
                        {WORDS[shown]}
                    </p>

                    <div>
                        <label
                            htmlFor={`rate-comment-${order.id}`}
                            className="text-sm font-semibold"
                        >
                            {stars > 0 && stars <= 3
                                ? 'What could we improve?'
                                : 'What did we do well?'}{' '}
                            <span className="font-normal text-pw-ink/70">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            id={`rate-comment-${order.id}`}
                            value={comment}
                            onChange={(e) =>
                                setComment(e.target.value.slice(0, MAX))
                            }
                            rows={3}
                            className="mt-2 w-full rounded-2xl border border-pw-ink/20 bg-white/60 p-3 text-sm outline-none focus:border-pw-peach"
                            placeholder="Tell us in a few words"
                        />
                        <p className="mt-1 text-right text-xs text-pw-ink/70">
                            {comment.length}/{MAX}
                        </p>
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-pw-rust">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={submit}
                        disabled={busy}
                        className="rounded-full bg-pw-ink px-6 py-2.5 text-sm font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink disabled:opacity-60"
                    >
                        {busy ? 'Saving…' : saved ? 'Update rating' : 'Send rating'}
                    </button>
                </DialogContent>
            </Dialog>
        </>
    );
}
