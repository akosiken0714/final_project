import { Link } from '@inertiajs/react';
import Reveal from '@/components/Reveal';

// "Two ways to order" explainer.
//
// GUEST ORDERING IS NOT BUILT YET (HANDOFF.md section 5, item 12). Until it is, the guest card shows "Coming soon"
// and no button, so the page never promises something the site cannot do.
// When item 12 is done: set GUEST_ORDERING to true and point GUEST_HREF at the guest order form.
const GUEST_ORDERING = false;
const GUEST_HREF = '/order/guest'; // placeholder route, change to the real one

const GUEST_POINTS = [
    'Just your name and phone number',
    'Cash only, pay when you get your laundry',
    'A tracking link for this one order',
    'No password to remember',
];

const ACCOUNT_POINTS = [
    'All your orders in one place, with live status',
    'A bell notification when your laundry changes status',
    'Save your usual order and reuse it in a tap',
    'Pay by cash or GCash, and rate your order afterwards',
];

function Points({ items }: { items: string[] }) {
    return (
        <ul className="mt-5 space-y-2.5 text-sm">
            {items.map((t) => (
                <li key={t} className="flex gap-3">
                    <span className="mt-0.5 text-pw-peach" aria-hidden="true">
                        ✓
                    </span>
                    <span>{t}</span>
                </li>
            ))}
        </ul>
    );
}

export default function LandingOrderWays({
    loggedIn = false,
}: {
    loggedIn?: boolean;
}) {
    // Someone who is already logged in does not need this.
    if (loggedIn) return null;

    return (
        <section
            id="ways-to-order"
            className="relative scroll-mt-24 px-6 py-20"
            aria-labelledby="ways-title"
        >
            <div className="relative z-10 mx-auto max-w-5xl">
                <Reveal className="text-center">
                    <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                        Ways to order
                    </p>
                    <h2
                        id="ways-title"
                        className="mt-3 font-serif text-5xl text-pw-cream md:text-6xl"
                    >
                        Your order,{' '}
                        <span className="text-pw-peach italic">
                            your choice
                        </span>
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-pw-cream/60">
                        In a hurry? Order as a guest. Want everything saved?
                        Log in. Either way you see your total before you
                        submit.
                    </p>
                </Reveal>

                <div className="mt-14 grid gap-x-8 gap-y-12 md:grid-cols-2">
                    <Reveal>
                        <div className="flex flex-col items-center">
                            <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-pw-cream/60" />
                            <div className="w-full rounded-3xl bg-pw-cream p-7 pt-9 text-pw-ink shadow-xl shadow-black/30">
                                <p className="text-[10px] tracking-[0.25em] text-pw-ink/70 uppercase">
                                    Fastest
                                </p>
                                <h3 className="mt-2 font-serif text-3xl">
                                    Order as a guest
                                </h3>
                                <p className="mt-2 text-sm text-pw-ink/70">
                                    No account needed. Order right away.
                                </p>
                                <Points items={GUEST_POINTS} />
                                <div className="mt-6 border-t border-dashed border-pw-ink/30 pt-4">
                                    {GUEST_ORDERING ? (
                                        <Link
                                            href={GUEST_HREF}
                                            className="text-xs font-semibold tracking-widest uppercase hover:underline"
                                        >
                                            Continue as guest →
                                        </Link>
                                    ) : (
                                        <span className="text-xs font-semibold tracking-widest text-pw-ink/70 uppercase">
                                            Coming soon
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={100}>
                        <div className="flex flex-col items-center">
                            <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-pw-peach" />
                            <div className="w-full rounded-3xl bg-pw-peach p-7 pt-9 text-pw-ink shadow-xl shadow-black/30">
                                <p className="text-[10px] tracking-[0.25em] text-pw-ink/70 uppercase">
                                    Best for regulars
                                </p>
                                <h3 className="mt-2 font-serif text-3xl">
                                    Log in or sign up
                                </h3>
                                <p className="mt-2 text-sm text-pw-ink/70">
                                    Takes a minute, and next time is quicker.
                                </p>
                                <Points items={ACCOUNT_POINTS} />
                                <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-dashed border-pw-ink/30 pt-4 text-xs font-semibold tracking-widest uppercase">
                                    <Link
                                        href="/register"
                                        className="hover:underline"
                                    >
                                        Create account →
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="hover:underline"
                                    >
                                        Log in
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
