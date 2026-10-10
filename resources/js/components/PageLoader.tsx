import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// how long the very first loader stays up at minimum, so it never just flashes
const MIN_FIRST_MS = 900;
// page changes only show the loader if they take longer than this
const SHOW_AFTER_MS = 200;
// once shown during a page change, keep it up at least this long
const MIN_NAV_MS = 400;
// must match the fade-out duration below
const FADE_MS = 500;

export default function PageLoader() {
    // `on` = should be visible, `mounted` = still in the DOM (stays mounted while fading out)
    const [on, setOn] = useState(true);
    const [mounted, setMounted] = useState(true);
    // true only for the very first load (full screen with background). after that, only the animation shows
    const [isFirst, setIsFirst] = useState(true);
    const shownAt = useRef(0);
    const showTimer = useRef<number>(0);
    const hideTimer = useRef<number>(0);

    const show = () => {
        window.clearTimeout(hideTimer.current);
        shownAt.current = Date.now();
        setMounted(true);
        setOn(true);
    };

    const hide = (min: number) => {
        const wait = Math.max(0, min - (Date.now() - shownAt.current));
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setOn(false), wait);
    };

    // first load: hide once the page has finished loading
    useEffect(() => {
        shownAt.current = Date.now();
        if (document.readyState === 'complete') {
            hide(MIN_FIRST_MS);
        } else {
            const done = () => hide(MIN_FIRST_MS);
            window.addEventListener('load', done, { once: true });
            // safety net: never trap the visitor behind the loader
            const t = window.setTimeout(done, 6000);
            return () => {
                window.removeEventListener('load', done);
                window.clearTimeout(t);
            };
        }
    }, []);

    // page changes (Inertia): show only if the visit is slow
    useEffect(() => {
        const offStart = router.on('start', (event: any) => {
            const visit = event?.detail?.visit;
            // ignore form posts / background requests, only real page navigations
            if (visit && visit.method && visit.method !== 'get') return;
            window.clearTimeout(showTimer.current);
            showTimer.current = window.setTimeout(show, SHOW_AFTER_MS);
        });
        const offFinish = router.on('finish', () => {
            window.clearTimeout(showTimer.current);
            if (shownAt.current && on) hide(MIN_NAV_MS);
        });
        return () => {
            offStart();
            offFinish();
            window.clearTimeout(showTimer.current);
            window.clearTimeout(hideTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [on]);

    // unmount after the fade-out finishes
    useEffect(() => {
        if (on) return;
        const t = window.setTimeout(() => {
            setMounted(false);
            setIsFirst(false);
        }, FADE_MS);
        return () => window.clearTimeout(t);
    }, [on]);

    // no scrolling behind the loader
    useEffect(() => {
        if (!mounted) return;
        const prev = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prev;
        };
    }, [mounted]);

    if (!mounted) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label="Loading"
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${isFirst ? 'bg-[#0F1E2B]' : 'bg-[#0B1F26]/85 backdrop-blur-sm'}`}
            style={{
                opacity: on ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease`,
                pointerEvents: on ? 'auto' : 'none',
            }}
        >
            <style>{`
                @keyframes pl-spin { to { transform: rotate(360deg); } }
                @keyframes pl-spin-rev { to { transform: rotate(-360deg); } }
                @keyframes pl-pulse { 0%, 100% { opacity: .35; } 50% { opacity: .75; } }
                @keyframes pl-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .pl-spin { transform-origin: 60px 60px; animation: pl-spin 6s linear infinite; }
                .pl-spin-rev { transform-origin: 60px 60px; animation: pl-spin-rev 14s linear infinite; }
                .pl-pulse { animation: pl-pulse 1.8s ease-in-out infinite; }
                .pl-in { animation: pl-in .7s cubic-bezier(.2,.8,.2,1) both; }
                @media (prefers-reduced-motion: reduce) { .pl-spin, .pl-spin-rev, .pl-pulse, .pl-in { animation: none; } }
            `}</style>

            {/* soft glow + grain, first load only */}
            {isFirst && (
                <>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5C8CA8]/15 blur-3xl" aria-hidden="true" />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, #F7F1E8 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, #F7F1E8 0 1px, transparent 1px 3px)' }}
                aria-hidden="true"
            />
                </>
            )}

            <div className="relative z-10 flex flex-col items-center">
                {/* a sewn-on button, slowly turning inside a stitched ring */}
                <svg viewBox="0 0 120 120" className="pl-in h-28 w-28" aria-hidden="true">
                    <g className="pl-spin-rev">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#F7F1E8" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
                    </g>
                    <g className="pl-spin">
                        <circle cx="60" cy="60" r="32" fill="#F0A98B" />
                        <circle cx="60" cy="60" r="23" fill="none" stroke="#0F1E2B" strokeOpacity="0.28" strokeWidth="1.5" />
                        {[[-7, -7], [7, -7], [-7, 7], [7, 7]].map(([dx, dy], i) => (
                            <circle key={i} cx={60 + dx} cy={60 + dy} r="3.4" fill="#0F1E2B" />
                        ))}
                        <path d="M53 53 L67 67 M67 53 L53 67" stroke="#F7F1E8" strokeWidth="2" strokeLinecap="round" />
                    </g>
                </svg>

                <p className="pl-in mt-6 font-serif text-4xl text-[#F7F1E8]" style={{ animationDelay: '.15s' }}>
                    PhineWash<span className="italic text-[#F0A98B]">.</span>
                </p>
                <p className="pl-in pl-pulse mt-3 text-[11px] uppercase tracking-[0.35em] text-[#A9D3E6]" style={{ animationDelay: '.3s' }}>
                    Naglalaba pa…
                </p>
            </div>
        </div>
    );
}