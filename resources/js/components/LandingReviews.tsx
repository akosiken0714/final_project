import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import Reveal from '@/components/Reveal';

type Review = {
    id: number;
    stars: number;
    comment: string;
    name: string;
    when: string | null;
};

type Summary = {
    average: number | null;
    count: number;
    // how many gave 5, 4, 3, 2 and 1 stars (in that order)
    breakdown?: number[];
};

type Props = {
    reviews?: Review[];
    summary?: Summary;
};

// HOW MANY CARDS: the server never sends more than 6 (see HomeController::REVIEW_LIMIT).
// SHOWN_AT_FIRST is how many are visible when the page loads (3 = one clean row on desktop).
// A "Show N more reviews" button reveals the rest. If there are only 3 or fewer reviews, the button hides itself.
const SHOWN_AT_FIRST = 3;

// Real customer comments, taken from the ratings people leave on finished orders (4 and 5 stars only are shown).
// Nothing to edit by hand: it fills itself, and hides itself until there is at least one written comment.
// Top: a score board (big average + how many gave each star). Below: the comments as cream "price tag" cards,
// so the section matches the pricing cards.

function Stars({
    n,
    size = 'text-sm',
    off = 'text-pw-ink/20',
}: {
    n: number;
    size?: string;
    off?: string;
}) {
    const full = Math.round(n);
    return (
        <span
            className={`${size} tracking-widest text-pw-peach`}
            role="img"
            aria-label={`${n} out of 5 stars`}
        >
            {'★'.repeat(full)}
            <span className={off}>{'★'.repeat(5 - full)}</span>
        </span>
    );
}

function Bar({ pct }: { pct: number }) {
    const calm = useReducedMotion();
    return (
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-pw-cream/10">
            <motion.div
                className="h-full rounded-full bg-pw-peach"
                initial={calm ? false : { width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: calm ? 0 : 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            />
        </div>
    );
}

// A small round badge with the customer's first letter.
function Initial({ name }: { name: string }) {
    return (
        <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pw-ink font-serif text-base text-pw-cream"
            aria-hidden="true"
        >
            {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
    );
}

export default function LandingReviews({
    reviews = [],
    summary = { average: null, count: 0 },
}: Props) {
    const [expanded, setExpanded] = useState(false);

    if (reviews.length === 0) return null;

    const hiddenCount = Math.max(0, reviews.length - SHOWN_AT_FIRST);
    const visible = expanded ? reviews : reviews.slice(0, SHOWN_AT_FIRST);

    const showBoard = summary.average !== null && summary.count > 0;
    const breakdown = summary.breakdown ?? [];
    const hasBars = breakdown.length === 5 && summary.count > 0;

    return (
        <section
            id="reviews"
            className="relative scroll-mt-24 px-6 py-20"
            aria-labelledby="reviews-title"
        >
            <div className="relative z-10 mx-auto max-w-6xl">
                <Reveal className="text-center">
                    <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                        Customer reviews
                    </p>
                    <h2
                        id="reviews-title"
                        className="mt-3 font-serif text-5xl text-pw-cream md:text-6xl"
                    >
                        Kind words from{' '}
                        <span className="text-pw-peach italic">
                            our customers
                        </span>
                    </h2>
                </Reveal>

                {showBoard && (
                    <Reveal>
                        <div className="mx-auto mt-12 grid max-w-3xl items-center gap-8 rounded-3xl border border-pw-cream/15 bg-pw-cream/[0.04] p-6 md:grid-cols-[auto_1fr] md:gap-12 md:p-8">
                            <div className="text-center">
                                <p className="font-serif text-7xl leading-none text-pw-cream md:text-8xl">
                                    {summary.average!.toFixed(1)}
                                </p>
                                <div className="mt-3">
                                    <Stars
                                        n={summary.average!}
                                        size="text-xl"
                                        off="text-pw-cream/20"
                                    />
                                </div>
                                <p className="mt-2 text-sm text-pw-cream/60">
                                    from {summary.count}{' '}
                                    {summary.count === 1 ? 'rating' : 'ratings'}
                                </p>
                            </div>

                            {hasBars && (
                                <ul
                                    className="space-y-2"
                                    aria-label="Ratings by number of stars"
                                >
                                    {breakdown.map((n, i) => {
                                        const star = 5 - i;
                                        const pct = Math.round(
                                            (n / summary.count) * 100,
                                        );
                                        return (
                                            <li
                                                key={star}
                                                className="flex items-center gap-3 text-sm text-pw-cream/70"
                                            >
                                                <span className="w-9 shrink-0 tabular-nums">
                                                    {star} ★
                                                </span>
                                                <Bar pct={pct} />
                                                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-pw-cream/50">
                                                    {n}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </Reveal>
                )}

                <div
                    id="reviews-list"
                    className="mt-14 flex flex-wrap justify-center gap-x-6 gap-y-12"
                >
                    {visible.map((r, i) => (
                        <Reveal
                            key={r.id}
                            delay={(i % 3) * 80}
                            className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
                        >
                            <figure
                                className="flex h-full flex-col items-center transition duration-300 hover:-translate-y-1"
                            >
                                <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-pw-peach" />
                                <div className="relative flex w-full flex-1 flex-col rounded-2xl bg-pw-cream px-6 pt-8 pb-6 text-pw-ink shadow-xl shadow-black/30">
                                    <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-pw-ink/40" />
                                    <span
                                        className="pointer-events-none absolute top-6 right-5 font-serif text-7xl leading-none text-pw-peach/40"
                                        aria-hidden="true"
                                    >
                                        &rdquo;
                                    </span>
                                    <Stars n={r.stars} size="text-base" />
                                    <blockquote className="mt-3 line-clamp-5 flex-1 font-serif text-xl leading-snug">
                                        {r.comment}
                                    </blockquote>
                                    <figcaption className="mt-5 flex items-center gap-3 border-t border-dashed border-pw-ink/30 pt-4">
                                        <Initial name={r.name} />
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold">
                                                {r.name}
                                            </span>
                                            <span className="block text-[11px] tracking-wide text-pw-ink/70">
                                                Verified order
                                                {r.when ? ` · ${r.when}` : ''}
                                            </span>
                                        </span>
                                    </figcaption>
                                </div>
                            </figure>
                        </Reveal>
                    ))}
                </div>

                {hiddenCount > 0 && (
                    <div className="mt-10 text-center">
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            aria-expanded={expanded}
                            aria-controls="reviews-list"
                            className="rounded-full border border-pw-cream/30 px-6 py-2.5 text-sm text-pw-cream transition duration-200 hover:border-pw-peach hover:text-pw-peach focus-visible:ring-2 focus-visible:ring-pw-peach focus-visible:outline-none"
                        >
                            {expanded
                                ? 'Show fewer reviews'
                                : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'review' : 'reviews'}`}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
