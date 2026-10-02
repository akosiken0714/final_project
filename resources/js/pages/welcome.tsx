import { Link, usePage } from '@inertiajs/react';
import { CSSProperties, PointerEvent as ReactPointerEvent, PropsWithChildren, RefObject, memo, useEffect, useRef, useState } from 'react';
import Reveal from '@/components/Reveal';
import Shell from '@/components/Shell';

// hero photo: save your image at public/images/hero.jpg (or change this path)
const HERO_IMG = '/images/hero.jpg';

const statuses = ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'];

const steps = [
    ['01', 'Place your order', 'Pick a service, enter the weight, and add any notes or a photo. Your total is worked out for you.'],
    ['02', 'We wash and dry', 'Once we receive your laundry, your order moves to In Progress.'],
    ['03', 'Ready for you', 'You get the green light when everything is clean and folded.'],
    ['04', 'Pick up or delivered', 'Come by the shop, or we bring it to your door.'],

];

// services shown on the landing page (real Phinewash pricing)
const LANDING_SERVICES = [
    { id: 'regular', name: 'Regular clothes', price: 180, unit: 'up to 8 kilos', note: 'Everyday laundry, washed and folded.' },
    { id: 'beddings', name: 'Beddings', price: 190, unit: 'up to 6 kilos', note: 'Sheets, pillowcases, and covers.' },
    { id: 'comforter-sm', name: 'Comforter (small–medium)', price: 200, unit: 'per piece', note: 'Single / double comforters.' },
    { id: 'comforter-king', name: 'Comforter (king)', price: 230, unit: 'per piece', note: 'King-size comforters.' },
];

// TODO: replace phone + hours with the final details
const SHOP = {
    name: 'Phinewash Laundry Shop',
    address: 'Poblacion, Anahawan, Southern Leyte (in front of the convent)',
    hours: 'Mon–Sat 8:00 AM – 7:00 PM · Sun 9:00 AM – 5:00 PM',
    phone: '0900 000 0000',
    mapQuery: 'Phinewash Laundry Shop, Poblacion, Anahawan, Southern Leyte',
    pickupNote: 'Pickup & delivery from ₱20 depending on distance.',
};

// tag that drops in when scrolled into view
function Drop({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
    const ref = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setShow(true);
                io.disconnect();
            }
        }, { threshold: 0.2 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return (
        <div ref={ref} className={`drop ${show ? 'show' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
}

// the big order tag (used in the sticky section)
function Tag({ step, name, total }: { step: number; name: string; total: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="h-24 w-px bg-[#F7F1E8]/40" />
            <div className="w-64 rounded-3xl bg-[#F7F1E8] px-7 pb-8 pt-6 text-[#0F1E2B] shadow-2xl">
                <div className="mx-auto -mt-1 mb-5 h-4 w-4 rounded-full border-2 border-[#0F1E2B]/40" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#0F1E2B]/50">Order tag</p>
                <p className="mt-1 font-serif text-3xl">#0042</p>
                <p className="mt-4 text-sm text-[#0F1E2B]/70">{name}</p>
                <div className="mt-5 flex gap-1.5">
                    {statuses.map((s, i) => (
                        <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-700 ${i <= step ? 'bg-[#F0A98B]' : 'bg-[#0F1E2B]/15'}`} />
                    ))}
                </div>
                <p key={step} className="rise mt-3 text-sm font-semibold">{statuses[step]}</p>
                <div className="mt-5 flex items-end justify-between border-t border-dashed border-[#0F1E2B]/25 pt-4">
                    <span className="text-[10px] uppercase tracking-widest text-[#0F1E2B]/50">Total</span>
                    <span className="font-serif text-2xl">₱{total}</span>
                </div>
            </div>
        </div>
    );
}

// the hero clothesline: real laundry on a line that reacts to the wind, your scrolling and your cursor
const lineY = (x: number) => 50 + 60 * (1 - Math.pow((x - 235) / 260, 2));

const CLOTHES = [
    { x: 80, kind: 'tee', k: 11, pins: [-20, 20] },
    { x: 190, kind: 'towel', k: 15, pins: [-30, 30] },
    { x: 285, kind: 'sock', k: 22, pins: [0] },
    { x: 360, kind: 'cloth', k: 17, pins: [-24, 24] },
    { x: 440, kind: 'kid', k: 20, pins: [-13, 13] },
] as const;

const TEE = 'M-20 0 L-42 12 L-52 34 L-34 40 L-30 30 L-30 78 L30 78 L30 30 L34 40 L52 34 L42 12 L20 0 C16 10 8 14 0 14 C-8 14 -16 10 -20 0 Z';

function Garment({ kind }: { kind: string }) {
    if (kind === 'tee') {
        return (
            <>
                <path d={TEE} fill="#F7F1E8" />
                <rect x="-30" y="66" width="60" height="6" fill="#F0A98B" opacity="0.85" />
            </>
        );
    }
    if (kind === 'towel') {
        return (
            <>
                <rect x="-38" y="0" width="76" height="104" rx="3" fill="#F0A98B" />
                <rect x="-38" y="76" width="76" height="5" fill="#F7F1E8" opacity="0.8" />
                <rect x="-38" y="86" width="76" height="3" fill="#F7F1E8" opacity="0.8" />
                {Array.from({ length: 9 }).map((_, i) => (
                    <line key={i} x1={-34 + i * 8.5} y1="104" x2={-34 + i * 8.5} y2="111" stroke="#F0A98B" strokeWidth="2" strokeLinecap="round" />
                ))}
                <circle className="hl-drip" cx="-8" cy="112" r="2.6" fill="#A9D3E6" />
            </>
        );
    }
    if (kind === 'sock') {
        return (
            <>
                <path d="M-14 0 H14 V46 C14 58 30 62 30 78 C30 96 6 100 -8 92 C-22 84 -14 62 -14 46 Z" fill="#5C8CA8" />
                <rect x="-14" y="0" width="28" height="11" fill="#A9D3E6" />
                <circle className="hl-drip hl-drip-b" cx="12" cy="98" r="2.4" fill="#A9D3E6" />
            </>
        );
    }
    if (kind === 'cloth') {
        return (
            <>
                <rect x="-32" y="0" width="64" height="84" rx="4" fill="#A9D3E6" />
                <rect x="-26" y="6" width="52" height="72" rx="3" fill="none" stroke="#F7F1E8" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.75" />
            </>
        );
    }
    return (
        <g transform="scale(0.62)">
            <path d={TEE} fill="#EDE4D3" />
            <rect x="-30" y="66" width="60" height="6" fill="#F0A98B" opacity="0.85" />
        </g>
    );
}

function HeroLine() {
    const box = useRef<HTMLDivElement>(null);
    const els = useRef<(SVGGElement | null)[]>([]);
    const vel = useRef<number[]>(CLOTHES.map(() => 0));
    const still = useRef(false);

    useEffect(() => {
        still.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ang = CLOTHES.map(() => 0);
        const paint = () =>
            els.current.forEach((g, i) => {
                const skew = Math.max(-8, Math.min(8, vel.current[i] * 0.03));
                g?.setAttribute('transform', `rotate(${ang[i].toFixed(2)}) skewX(${skew.toFixed(2)})`);
            });

        if (still.current) {
            CLOTHES.forEach((_, i) => (ang[i] = i % 2 ? 2 : -2));
            paint();
            return;
        }

        let gust = 0;
        let lastY = window.scrollY;
        let last = performance.now();
        let raf = 0;
        let visible = true;

        // scrolling the page makes a gust, like walking past a washing line
        const onScroll = () => {
            const y = window.scrollY;
            gust = Math.max(-28, Math.min(28, gust + (y - lastY) * 0.25));
            lastY = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
        if (box.current) io.observe(box.current);

        const tick = (now: number) => {
            const dt = Math.min(0.033, (now - last) / 1000);
            last = now;
            if (visible) {
                const t = now / 1000;
                gust *= Math.pow(0.15, dt);
                CLOTHES.forEach((c, i) => {
                    // a breeze that travels along the line, and a stronger gust every few seconds
                    const breeze = Math.sin(t * 0.9 - c.x / 90) * 3;
                    const pulse = Math.pow(Math.max(0, Math.sin(t * 0.5 - c.x / 260)), 8) * 15;
                    const target = -(breeze + pulse) - gust;
                    const w = Math.sqrt(c.k);
                    const acc = c.k * (target - ang[i]) - 2 * 0.28 * w * vel.current[i];
                    vel.current[i] += acc * dt;
                    ang[i] = Math.max(-45, Math.min(45, ang[i] + vel.current[i] * dt));
                });
                paint();
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            io.disconnect();
        };
    }, []);

    // brushing your cursor across the line swings the laundry
    const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (still.current || !box.current) return;
        const r = box.current.getBoundingClientRect();
        const scale = 480 / r.width;
        const sx = (e.clientX - r.left) * scale;
        const dx = e.movementX * scale;
        CLOTHES.forEach((c, i) => {
            if (Math.abs(sx - c.x) < 70) {
                vel.current[i] = Math.max(-260, Math.min(260, vel.current[i] - dx * 6));
            }
        });
    };

    const pts = Array.from({ length: 27 }, (_, i) => `${i === 0 ? 'M' : 'L'} ${-20 + i * 20} ${lineY(-20 + i * 20).toFixed(1)}`).join(' ');

    return (
        <div ref={box} onPointerMove={onMove} className="w-full max-w-[480px] md:ml-auto">
            <style>{`
                @keyframes hl-drip { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: .9; } 80% { opacity: .6; } 100% { transform: translateY(40px); opacity: 0; } }
                .hl-drip { animation: hl-drip 3.4s ease-in infinite; }
                .hl-drip-b { animation-delay: 1.7s; }
                @media (prefers-reduced-motion: reduce) { .hl-drip { animation: none; opacity: 0; } }
            `}</style>
            <svg viewBox="0 0 480 270" className="h-auto w-full overflow-visible" style={{ filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.35))' }} aria-hidden="true">
                <path d={pts} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="3" transform="translate(0 3)" />
                <path d={pts} fill="none" stroke="rgba(247,241,232,0.7)" strokeWidth="2.2" strokeLinecap="round" />
                {CLOTHES.map((c, i) => (
                    <g key={c.x} transform={`translate(${c.x} ${lineY(c.x).toFixed(1)})`}>
                        <g ref={(el) => { els.current[i] = el; }}>
                            <Garment kind={c.kind} />
                        </g>
                    </g>
                ))}
                {CLOTHES.flatMap((c) =>
                    c.pins.map((dx) => (
                        <g key={`${c.x}-${dx}`} transform={`translate(${c.x + dx} ${lineY(c.x + dx).toFixed(1)})`}>
                            <rect x="-4.5" y="-8" width="9" height="20" rx="2.5" fill="#F0A98B" />
                            <rect x="-4.5" y="-8" width="9" height="5" rx="2" fill="#F7F1E8" opacity="0.35" />
                        </g>
                    )),
                )}
            </svg>
        </div>
    );
}

// the sewing thread: one peach thread that stitches the sections together (desktop only)
const SewThread = memo(function SewThread({ wrap }: { wrap: RefObject<HTMLDivElement | null> }) {
    const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null);
    const path = useRef<SVGPathElement>(null);
    const needle = useRef<SVGGElement>(null);

    // work out the route from where the sections really are on the page
    useEffect(() => {
        const box = wrap.current;
        if (!box) return;
        const build = () => {
            const w = box.clientWidth;
            const h = box.clientHeight;
            if (w < 1280) {
                setGeo(null);
                return;
            }
            const top = box.getBoundingClientRect().top;
            const at = (sel: string) => {
                const el = box.querySelector(sel);
                return el ? el.getBoundingClientRect().top - top : null;
            };
            const marks = ['#features', '#pricing', '#find-us', '#about'].map(at);
            const footer = at('footer');
            const end = footer !== null ? footer : h;
            if (marks.some((m) => m === null)) {
                setGeo(null);
                return;
            }
            const left = Math.max(20, (w - 1152) / 4);
            const right = w - left;
            let x = left;
            let d = `M ${left} 0`;
            (marks as number[]).forEach((y) => {
                const nx = x === left ? right : left;
                d += ` L ${x} ${y - 70} C ${x} ${y} ${nx} ${y} ${nx} ${y + 70}`;
                x = nx;
            });
            d += ` L ${x} ${end}`;
            setGeo((prev) => (prev && prev.d === d && prev.w === w && prev.h === h ? prev : { w, h, d }));
        };
        build();
        const ro = new ResizeObserver(build);
        ro.observe(box);
        return () => ro.disconnect();
    }, [wrap]);

    // draw the thread as you scroll (no React re-render on scroll)
    useEffect(() => {
        const box = wrap.current;
        const p = path.current;
        const n = needle.current;
        if (!geo || !box || !p || !n) return;

        const L = p.getTotalLength();
        const N = 240;
        const ys = Array.from({ length: N + 1 }, (_, i) => p.getPointAtLength((L * i) / N).y);

        const draw = (f: number) => {
            p.style.strokeDasharray = `${L}`;
            p.style.strokeDashoffset = `${L * (1 - f)}`;
            const pt = p.getPointAtLength(L * f);
            n.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
            n.style.opacity = f > 0.002 ? '1' : '0';
        };

        // reduced motion: show the finished thread, no animation
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            draw(1);
            return;
        }

        const update = () => {
            // needle normally sits ~66% down the viewport, but slides toward the page bottom
            // as you near the end, so the thread finishes its last stretch smoothly
            const rect = box.getBoundingClientRect();
            const scrolled = window.scrollY + window.innerHeight;
            const total = document.documentElement.scrollHeight;
            const remain = Math.max(0, total - scrolled); // px left until page bottom
            const easeZone = window.innerHeight * 2;       // last two viewport-heights of scroll
            const t = 1 - Math.min(1, remain / easeZone);  // 0 far from bottom, 1 at bottom
            const refLine = window.innerHeight * (0.66 + 0.34 * t);
            const y = refLine - rect.top;

            let lo = 0;
            let hi = N;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (ys[mid] < y) lo = mid + 1;
                else hi = mid;
            }
            const i = Math.max(1, lo);
            const a = ys[i - 1];
            const b = ys[i];
            const f = (i - 1 + (b > a ? (y - a) / (b - a) : 0)) / N;
            draw(Math.max(0, Math.min(1, f)));
        };

        let raf = 0;
        const onScroll = () => {
            if (!raf) {
                raf = requestAnimationFrame(() => {
                    raf = 0;
                    update();
                });
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        update();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
        };
    }, [geo, wrap]);

    if (!geo) return null;
    return (
        <svg className="pointer-events-none absolute left-0 top-0 z-0" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
            {/* the whole route as faint stitch holes */}
            <path d={geo.d} fill="none" stroke="#F7F1E8" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" />
            {/* the thread itself */}
            <path ref={path} d={geo.d} fill="none" stroke="#F0A98B" strokeWidth="2" strokeLinecap="round" style={{ strokeDasharray: 100000, strokeDashoffset: 100000 }} />
            {/* the needle */}
            <g ref={needle} style={{ opacity: 0 }}>
                <circle className="sew-pulse" r="7" fill="#F0A98B" />
                <circle r="4.5" fill="#F0A98B" />
                <circle r="1.8" fill="#0F1E2B" />
            </g>
        </svg>
    );
});

// soft glows, fine grain and slow-drifting lint behind everything below the hero
const SPECKS = Array.from({ length: 16 }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    size: 2 + (i % 3),
    dur: 26 + ((i * 7) % 18),
    delay: -((i * 5) % 30),
    dx: ((i % 2) * 2 - 1) * (14 + (i % 4) * 6),
    o: 0.22 + (i % 3) * 0.1,
    c: i % 3 === 0 ? '#A9D3E6' : '#F7F1E8',
}));

const SewBackdrop = memo(function SewBackdrop({ progress = 0 }: { progress?: number }) {
    return (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
            {/* soft ambient vignette — same palette, adds depth so the bg stops reading flat */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(1200px 800px at 15% 10%, rgba(92,140,168,0.10), transparent 60%),' +
                        'radial-gradient(900px 700px at 85% 85%, rgba(240,169,139,0.06), transparent 60%),' +
                        'radial-gradient(1400px 1000px at 50% 50%, rgba(15,30,43,0), rgba(9,18,26,0.35) 100%)',
                }}
            />
            {/* fine film grain — data-URI noise, no image file needed */}
            <div
                className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    backgroundSize: '180px 180px',
                }}
            />
            {/* very faint diagonal weave — reads as woven fabric, nearly invisible */}
            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(45deg, #F7F1E8 0 1px, transparent 1px 3px),' +
                        'repeating-linear-gradient(-45deg, #F7F1E8 0 1px, transparent 1px 3px)',
                }}
            />
            {/* ambient light that drifts with scroll position */}
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(700px 500px at ${20 + (progress % 60)}% ${10 + (progress * 0.6) % 70}%, rgba(169,211,230,0.06), transparent 60%)`,
                }}
            />
            <div className="sew-glow absolute inset-0" />
            <div className="sew-grain absolute inset-0" />
            {/* fixed so the lint drifts across the viewport, not trapped in the wrapper box */}
            <div className="fixed inset-0 overflow-hidden">
                {SPECKS.map((s, i) => (
                    <span
                        key={i}
                        className="sew-speck"
                        style={{ left: `${s.left}%`, width: s.size, height: s.size, background: s.c, '--d': `${s.dur}s`, '--delay': `${s.delay}s`, '--dx': `${s.dx}px`, '--o': s.o } as CSSProperties}
                    />
                ))}
            </div>
        </div>
    );
});


export default function Welcome({ services }: { services: any[] }) {
    const { auth }: any = usePage().props;
    const start = auth?.user ? '/dashboard' : '/register';

    // pull the services straight from the DB so admin edits show up here
    const shown = services.length > 0 ? services : LANDING_SERVICES;
    const first = shown[0];
    const tagName = first ? first.name : 'Regular clothes';
    const tagTotal = first ? String(first.price) : '180';

    const [activeStep, setActiveStep] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [progress, setProgress] = useState(0);
    const sew = useRef<HTMLDivElement>(null);

    // scroll position for progress line and parallax
    useEffect(() => {
        const onScroll = () => {
            const h = document.documentElement.scrollHeight - window.innerHeight;
            setScrollY(window.scrollY);
            setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // which step is in the middle of the screen
    useEffect(() => {
        const els = document.querySelectorAll('[data-step]');
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) setActiveStep(Number(e.target.getAttribute('data-step')));
                });
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    return (
        <Shell bare>
            {/* scroll progress line */}
            <div className="fixed left-0 top-0 z-50 h-0.5 bg-[#F0A98B]" style={{ width: `${progress}%` }} />

            {/* HERO — illustration behind, a clothesline of laundry on the right, three promises along the bottom */}
            <section
                className="relative flex min-h-[88vh] flex-col overflow-hidden px-6 pb-10 pt-20 md:pt-28"
                style={{
                    backgroundImage: `url(${HERO_IMG})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {/* dark overlay so text stays readable */}
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(to right, rgba(15,30,43,0.92) 0%, rgba(15,30,43,0.75) 50%, rgba(15,30,43,0.55) 100%)',
                    }}
                />

                {/* soft accent glow */}
                <div className="float pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-[#5C8CA8]/25 blur-3xl" />

                <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-16">
                    <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
                        <div style={{ opacity: Math.max(0, 1 - scrollY / 500), transform: `translateY(${scrollY * 0.2}px)` }}>
                            <p className="rise text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">{SHOP.name}</p>
                            <h1 className="rise mt-6 font-serif text-6xl leading-[1.05] text-[#F7F1E8] md:text-8xl" style={{ animationDelay: '.1s' }}>
                                Fresh, folded,<br />
                                <span className="italic text-[#F0A98B]">finished.</span>
                            </h1>
                            <p className="rise mt-8 max-w-sm text-[#F7F1E8]/60" style={{ animationDelay: '.25s' }}>
                                Kaya kong tanggalin ang mantsa, pero hindi ang alaala niya sa'yo.
                            </p>
                            <Link
                                href={start}
                                className="rise group mt-10 inline-flex items-center gap-3 border-b border-[#F7F1E8]/40 pb-1 text-lg text-[#F7F1E8] transition hover:border-[#F0A98B] hover:text-[#F0A98B]"
                                style={{ animationDelay: '.4s' }}
                            >
                                {auth?.user ? 'Go to dashboard' : 'Start an order'}
                                <span className="transition group-hover:translate-x-2">→</span>
                            </Link>
                        </div>

                        <div className="rise md:pt-6" style={{ animationDelay: '.5s' }}>
                            <HeroLine />
                        </div>
                    </div>

                    <ul className="rise grid gap-6 border-t border-[#F7F1E8]/20 pt-6 md:grid-cols-3" style={{ animationDelay: '.55s' }}>
                        <li>
                            <p className="font-serif text-xl text-[#F7F1E8]">
                                Fixed <span className="italic text-[#F0A98B]">per-load</span>
                            </p>
                            <p className="mt-1 text-sm text-[#F7F1E8]/60">₱180 for up to 8kg of regular clothes.</p>
                        </li>
                        <li>
                            <p className="font-serif text-xl text-[#F7F1E8]">
                                Track every <span className="italic text-[#F0A98B]">step</span>
                            </p>
                            <p className="mt-1 text-sm text-[#F7F1E8]/60">From pending to ready, right on your phone.</p>
                        </li>
                        <li>
                            <p className="font-serif text-xl text-[#F7F1E8]">
                                Pickup & <span className="italic text-[#F0A98B]">delivery</span>
                            </p>
                            <p className="mt-1 text-sm text-[#F7F1E8]/60">From ₱20 depending on distance.</p>
                        </li>
                    </ul>
                </div>
            </section>

            <div ref={sew} className="relative isolate overflow-x-clip">
                <SewBackdrop progress={progress} />
                <SewThread wrap={sew} />

                {/* HOW IT WORKS: sticky tag follows the steps */}
                <section id="features" className="relative scroll-mt-24 px-6 py-24">
                    {/* soft halo behind the heading */}
                    <div
                        className="pointer-events-none absolute left-1/2 top-24 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(closest-side, rgba(169,211,230,0.08), transparent)' }}
                        aria-hidden="true"
                    />
                    <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
                        <div className="md:sticky md:top-20 md:h-[80vh] md:self-start">
                            <Reveal>
                                <p className="text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">How it works</p>
                                <h2 className="mt-4 font-serif text-5xl text-[#F7F1E8] md:text-6xl">
                                    Follow your <span className="italic text-[#F0A98B]">tag.</span>
                                </h2>
                            </Reveal>
                            <div className="relative mt-6 flex justify-center md:justify-start md:pl-10">
                                <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0A98B]/10 blur-3xl md:left-[calc(2.5rem+8rem)]" />
                                <div className="swing">
                                    <Tag step={activeStep} name={tagName} total={tagTotal} />
                                </div>
                            </div>
                        </div>

                        <div>
                            {steps.map(([n, title, text], i) => (
                                <div key={n} data-step={i} className="flex min-h-[70vh] items-center">
                                    <Reveal>
                                        <div className={`border-t pt-6 transition-colors duration-500 ${i === activeStep ? 'border-[#F0A98B]' : 'border-[#F7F1E8]/20'}`}>
                                            <p className="text-xs tracking-widest text-[#A9D3E6]">{n}</p>
                                            <h3 className="mt-3 font-serif text-4xl text-[#F7F1E8]">{title}</h3>
                                            <p className="mt-3 max-w-sm text-[#F7F1E8]/60">{text}</p>
                                        </div>
                                    </Reveal>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* PRICING: clothesline — 4 real Phinewash tiers */}
                <section id="pricing" className="relative scroll-mt-24 px-6 py-24">
                    {/* soft peach halo behind the heading */}
                    <div
                        className="pointer-events-none absolute left-1/2 top-24 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(closest-side, rgba(240,169,139,0.08), transparent)' }}
                        aria-hidden="true"
                    />
                    <div className="relative mx-auto max-w-6xl">
                        <Reveal className="text-center">
                            <p className="text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Price list</p>
                            <h2 className="mt-4 font-serif text-5xl text-[#F7F1E8] md:text-6xl">
                                Simple, <span className="italic text-[#F0A98B]">honest</span> prices.
                            </h2>
                            <p className="mt-3 text-[#F7F1E8]/60">
                                Fixed per load or per piece — you always see your total before you place an order.
                            </p>
                        </Reveal>

                        <div className="relative mt-20">
                            <div className="absolute left-0 right-0 top-0 h-0.5 bg-[#F7F1E8]/40" />
                            <div className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-4">
                                {shown.map((s, i) => (
                                    <Drop key={s.id} delay={i * 180}>
                                        <div className="swing flex flex-col items-center" style={{ animationDuration: `${4 + i}s`, animationDelay: `${i * 0.4}s` }}>
                                            <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-[#F0A98B]" />
                                            <div className={`w-full max-w-[220px] rounded-2xl px-5 pb-6 pt-8 text-center text-[#0F1E2B] shadow-xl transition duration-300 hover:scale-105 ${i === 0 ? 'bg-[#F0A98B]' : 'bg-[#F7F1E8]'}`}>
                                                <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                                                <p className="text-[10px] uppercase tracking-[0.25em] text-[#0F1E2B]/60">{i === 0 ? 'Most popular' : 'Service'}</p>
                                                <p className="mt-2 text-sm font-semibold">{s.name}</p>
                                                <p className="mt-3 font-serif text-5xl">₱{s.price}</p>
                                                <p className="text-xs text-[#0F1E2B]/60">{s.unit}</p>
                                                <p className="mt-2 text-[11px] text-[#0F1E2B]/50">{s.note}</p>
                                                <Link href={start} className="mt-5 block border-t border-dashed border-[#0F1E2B]/30 pt-3 text-xs font-semibold uppercase tracking-widest hover:underline">
                                                    Order →
                                                </Link>
                                            </div>
                                        </div>
                                    </Drop>
                                ))}
                            </div>
                        </div>

                        <Reveal>
                            <p className="mt-14 text-center text-sm text-[#F7F1E8]/60">
                                Comforters are washed separately because of their weight.{' '}
                                {SHOP.pickupNote}
                            </p>
                        </Reveal>
                    </div>
                </section>

                {/* FIND US */}
                <section id="find-us" className="relative scroll-mt-24 px-6 py-24">
                    <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
                        <Reveal>
                            <p className="text-xs uppercase tracking-[0.3em] text-[#A9D3E6]">Find us</p>
                            <h2 className="mt-3 font-serif text-5xl text-[#F7F1E8] md:text-6xl">
                                Drop by <span className="italic text-[#F0A98B]">the shop</span>
                            </h2>
                            <dl className="mt-8 space-y-5 text-[#F7F1E8]">
                                <div>
                                    <dt className="text-xs uppercase tracking-[0.25em] text-[#A9D3E6]/70">Address</dt>
                                    <dd className="mt-1">{SHOP.address}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-[0.25em] text-[#A9D3E6]/70">Hours</dt>
                                    <dd className="mt-1">{SHOP.hours}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-[0.25em] text-[#A9D3E6]/70">Phone</dt>
                                    <dd className="mt-1"><a href={`tel:${SHOP.phone.replace(/\s/g, '')}`} className="hover:text-[#F0A98B]">{SHOP.phone}</a></dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-[0.25em] text-[#A9D3E6]/70">Pickup & delivery</dt>
                                    <dd className="mt-1">{SHOP.pickupNote}</dd>
                                </div>
                            </dl>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.mapQuery)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="mt-8 inline-block rounded-full bg-[#F7F1E8] px-8 py-4 font-semibold text-[#0F1E2B] shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-[#F0A98B]"
                            >
                                Get directions
                            </a>
                        </Reveal>

                        <Reveal>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-[#F0A98B]" />
                                <div className="w-full max-w-sm rounded-3xl bg-[#F7F1E8] p-6 pt-8 text-[#0F1E2B] shadow-2xl shadow-black/40">
                                    <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                                    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-[#0F1E2B]/15 bg-[#EFE7D8]">
                                        {/* default Google map — natural colors, native pin, Google's own "Open in Maps" chip */}
                                        <iframe
                                            title={`${SHOP.name} location`}
                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(SHOP.mapQuery)}&z=16&output=embed`}
                                            className="absolute inset-0 h-full w-full"
                                            style={{ border: 0, filter: 'saturate(0.72) brightness(0.96) contrast(0.98)' }}
                                            loading="lazy"
                                            allowFullScreen
                                            referrerPolicy="no-referrer-when-downgrade"
                                        />
                                        {/* warm cream wash — just enough to tie the map into the tag's palette */}
                                        <div
                                            className="pointer-events-none absolute inset-0 mix-blend-multiply"
                                            style={{ background: 'linear-gradient(180deg, rgba(247,241,232,0.18), rgba(240,169,139,0.08))' }}
                                            aria-hidden="true"
                                        />
                                        {/* soft inner ring so the map reads as framed inside the tag */}
                                        <div
                                            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[#0F1E2B]/10"
                                            aria-hidden="true"
                                        />
                                    </div>
                                    <p className="mt-4 text-xs uppercase tracking-[0.3em] text-[#0F1E2B]/60">{SHOP.name}</p>
                                    <p className="mt-1 text-sm text-[#0F1E2B]/70">Visit us in Poblacion, Anahawan.</p>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* CTA */}
                <section id="about" className="relative scroll-mt-24 px-6 py-28 text-center">
                    {/* soft warm halo behind the closing headline */}
                    <div
                        className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(closest-side, rgba(240,169,139,0.10), transparent)' }}
                        aria-hidden="true"
                    />
                    <Reveal>
                        <h2 className="relative mx-auto max-w-2xl font-serif text-5xl leading-tight text-[#F7F1E8] md:text-7xl">
                            Clean clothes, <span className="italic text-[#F0A98B]">zero fuss.</span>
                        </h2>
                        <p className="relative mx-auto mt-4 max-w-sm text-[#F7F1E8]/60">Book online in a minute and follow your laundry all the way to pickup.</p>
                        <Link href={start} className="relative mt-10 inline-block rounded-full bg-[#F7F1E8] px-8 py-4 font-semibold text-[#0F1E2B] transition hover:-translate-y-0.5 hover:bg-[#F0A98B]">
                            Place your first order
                        </Link>
                    </Reveal>
                </section>

                <footer className="border-t border-[#F7F1E8]/10 px-6 py-8 text-center text-xs text-[#F7F1E8]/40">
                    © 2026 {SHOP.name} · Wash, Dry & Fold · Pickup and delivery available
                </footer>
            </div>
        </Shell>
    );
}