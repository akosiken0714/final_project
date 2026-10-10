import { Link, usePage } from '@inertiajs/react';
import {
    CSSProperties,
    PointerEvent as ReactPointerEvent,
    PropsWithChildren,
    RefObject,
    memo,
    useEffect,
    useRef,
    useState,
} from 'react';
import Reveal from '@/components/Reveal';
import BlurText from '@/components/fx/BlurText';
import CountUp from '@/components/fx/CountUp';
import SpotlightCard from '@/components/fx/SpotlightCard';
import Shell from '@/components/Shell';

const statuses = ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'];

const steps = [
    [
        '01',
        'Place your order',
        'Pick a service, enter the weight, and add any notes or a photo. Your total is worked out for you.',
    ],
    [
        '02',
        'We wash and dry',
        'Once we receive your laundry, your order moves to In Progress.',
    ],
    [
        '03',
        'Ready for you',
        'You get the green light when everything is clean and folded.',
    ],
    [
        '04',
        'Pick up or delivered',
        'Come by the shop, or we bring it to your door.',
    ],
];

const LANDING_SERVICES = [
    {
        id: 'regular',
        name: 'Regular clothes',
        price: 180,
        unit: 'up to 8 kilos',
        note: 'Everyday laundry, washed and folded.',
    },
    {
        id: 'beddings',
        name: 'Beddings',
        price: 190,
        unit: 'up to 6 kilos',
        note: 'Sheets, pillowcases, and covers.',
    },
    {
        id: 'comforter-sm',
        name: 'Comforter (small–medium)',
        price: 200,
        unit: 'per piece',
        note: 'Single / double comforters.',
    },
    {
        id: 'comforter-king',
        name: 'Comforter (king)',
        price: 230,
        unit: 'per piece',
        note: 'King-size comforters.',
    },
];

const SHOP = {
    name: 'PhineWash Laundry Services',
    address: 'Poblacion, Anahawan, Southern Leyte (in front of the convent)',
    hours: 'Mon–Sat 8:00 AM – 7:00 PM · Sun 9:00 AM – 5:00 PM',
    phone: '0900 000 0000',
    mapQuery: 'PhineWash Laundry Services, Poblacion, Anahawan, Southern Leyte',
    pickupNote: 'Pickup & delivery from ₱20 depending on distance.',
};

const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Drop({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
    const ref = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShow(true);
                    io.disconnect();
                }
            },
            { threshold: 0.2 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return (
        <div
            ref={ref}
            className={`drop ${show ? 'show' : ''}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

function Magnetic({
    children,
    className = '',
}: PropsWithChildren<{ className?: string }>) {
    const ref = useRef<HTMLSpanElement>(null);
    const onMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
        const el = ref.current;
        if (!el || e.pointerType !== 'mouse' || reducedMotion()) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    const onLeave = () => {
        if (ref.current) ref.current.style.transform = '';
    };
    return (
        <span
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            className={`inline-block transition-transform duration-300 ease-out ${className}`}
        >
            {children}
        </span>
    );
}

function Tilt({ children }: PropsWithChildren) {
    const ref = useRef<HTMLDivElement>(null);
    const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const el = ref.current;
        if (!el || e.pointerType !== 'mouse' || reducedMotion()) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(700px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg)`;
    };
    const onLeave = () => {
        if (ref.current) ref.current.style.transform = '';
    };
    return (
        <div
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            className="flex w-full justify-center transition-transform duration-200 ease-out will-change-transform"
        >
            {children}
        </div>
    );
}

function Tag({
    step,
    name,
    total,
}: {
    step: number;
    name: string;
    total: string;
}) {
    return (
        <div className="flex flex-col items-center">
            <div className="h-24 w-px bg-[#F7F1E8]/40" />
            <div className="w-64 rounded-3xl bg-[#F7F1E8] px-7 pt-6 pb-8 text-[#0F1E2B] shadow-2xl">
                <div className="mx-auto -mt-1 mb-5 h-4 w-4 rounded-full border-2 border-[#0F1E2B]/40" />
                <p className="text-[10px] tracking-[0.3em] text-[#0F1E2B]/50 uppercase">
                    Order tag
                </p>
                <p className="mt-1 font-serif text-3xl">#0042</p>
                <p className="mt-4 text-sm text-[#0F1E2B]/70">{name}</p>
                <div className="mt-5 flex gap-1.5">
                    {statuses.map((s, i) => (
                        <div
                            key={s}
                            className={`h-1 flex-1 rounded-full transition-all duration-700 ${i <= step ? 'bg-[#F0A98B]' : 'bg-[#0F1E2B]/15'}`}
                        />
                    ))}
                </div>
                <p key={step} className="rise mt-3 text-sm font-semibold">
                    {statuses[step]}
                </p>
                <div className="mt-5 flex items-end justify-between border-t border-dashed border-[#0F1E2B]/25 pt-4">
                    <span className="text-[10px] tracking-widest text-[#0F1E2B]/50 uppercase">
                        Total
                    </span>
                    <span className="font-serif text-2xl">₱{total}</span>
                </div>
            </div>
        </div>
    );
}

type Geo = {
    w: number;
    h: number;
    d: string;
    btns: { x: number; y: number }[];
};

const SewThread = memo(function SewThread({
    wrap,
}: {
    wrap: RefObject<HTMLDivElement | null>;
}) {
    const [geo, setGeo] = useState<Geo | null>(null);
    const path = useRef<SVGPathElement>(null);
    const glow = useRef<SVGPathElement>(null);
    const needle = useRef<SVGGElement>(null);
    const needleRot = useRef<SVGGElement>(null);
    const buds = useRef<(SVGGElement | null)[]>([]);

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
            const marks = ['#features', '#pricing', '#find-us', '#about'].map(
                at,
            );
            const footer = at('footer');
            const end = footer !== null ? footer : h;
            if (marks.some((m) => m === null)) {
                setGeo(null);
                return;
            }
            const left = Math.max(20, (w - 1152) / 4);
            const right = w - left;
            let x = left;
            let prevY = 0;
            let d = `M ${left} 0`;
            const btns: { x: number; y: number }[] = [];
            (marks as number[]).forEach((y) => {
                const nx = x === left ? right : left;
                btns.push({ x, y: (prevY + y - 70) / 2 });
                d += ` L ${x} ${y - 70} C ${x} ${y} ${nx} ${y} ${nx} ${y + 70}`;
                x = nx;
                prevY = y + 70;
            });
            btns.push({ x, y: (prevY + end) / 2 });
            d += ` L ${x} ${end}`;
            setGeo((prev) =>
                prev && prev.d === d && prev.w === w && prev.h === h
                    ? prev
                    : { w, h, d, btns },
            );
        };
        build();
        const ro = new ResizeObserver(build);
        ro.observe(box);
        return () => ro.disconnect();
    }, [wrap]);

    useEffect(() => {
        const box = wrap.current;
        const p = path.current;
        const n = needle.current;
        if (!geo || !box || !p || !n) return;

        const L = p.getTotalLength();
        const N = 240;
        const ys = Array.from(
            { length: N + 1 },
            (_, i) => p.getPointAtLength((L * i) / N).y,
        );

        const need = geo.btns.map((b) => {
            let lo = 0;
            let hi = N;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (ys[mid] < b.y) lo = mid + 1;
                else hi = mid;
            }
            return lo / N;
        });

        const draw = (f: number) => {
            const dash = `${L}`;
            const off = `${L * (1 - f)}`;
            p.style.strokeDasharray = dash;
            p.style.strokeDashoffset = off;
            const g = glow.current;
            if (g) {
                g.style.strokeDasharray = dash;
                g.style.strokeDashoffset = off;
            }
            const len = L * f;
            const pt = p.getPointAtLength(len);
            const back = p.getPointAtLength(Math.max(0, len - 3));
            const ang =
                (Math.atan2(pt.y - back.y, pt.x - back.x) * 180) / Math.PI;
            n.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
            needleRot.current?.setAttribute(
                'transform',
                `rotate(${ang.toFixed(1)})`,
            );
            n.style.opacity = f > 0.002 ? '1' : '0';
            buds.current.forEach((b, i) => {
                if (!b) return;
                const on = f >= need[i];
                b.style.opacity = on ? '1' : '0';
                b.style.transform = on ? 'scale(1)' : 'scale(0.4)';
            });
        };

        if (reducedMotion()) {
            draw(1);
            return;
        }

        const update = () => {
            const rect = box.getBoundingClientRect();
            const scrolled = window.scrollY + window.innerHeight;
            const total = document.documentElement.scrollHeight;
            const remain = Math.max(0, total - scrolled);
            const easeZone = window.innerHeight * 2;
            const t = 1 - Math.min(1, remain / easeZone);
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
        <svg
            className="pointer-events-none absolute top-0 left-0 z-0"
            width={geo.w}
            height={geo.h}
            viewBox={`0 0 ${geo.w} ${geo.h}`}
            aria-hidden="true"
        >
            <path
                d={geo.d}
                fill="none"
                stroke="#F7F1E8"
                strokeOpacity="0.16"
                strokeWidth="1.5"
                strokeDasharray="2 9"
                strokeLinecap="round"
            />

            {geo.btns.map((b, i) => (
                <g key={i} transform={`translate(${b.x} ${b.y})`}>
                    <circle
                        r="12"
                        fill="none"
                        stroke="#F7F1E8"
                        strokeOpacity="0.22"
                        strokeWidth="1.5"
                        strokeDasharray="2 4"
                    />
                    <g
                        ref={(el) => {
                            buds.current[i] = el;
                        }}
                        style={{
                            opacity: 0,
                            transform: 'scale(0.4)',
                            transformBox: 'fill-box',
                            transformOrigin: 'center',
                            transition:
                                'opacity .45s ease, transform .5s cubic-bezier(.2,.9,.3,1.4)',
                        }}
                    >
                        <circle r="12" fill="#F0A98B" />
                        <circle
                            r="8"
                            fill="none"
                            stroke="#0F1E2B"
                            strokeOpacity="0.28"
                            strokeWidth="1"
                        />
                        {[
                            [-2.8, -2.8],
                            [2.8, -2.8],
                            [-2.8, 2.8],
                            [2.8, 2.8],
                        ].map(([hx, hy], k) => (
                            <circle
                                key={k}
                                cx={hx}
                                cy={hy}
                                r="1.4"
                                fill="#0F1E2B"
                            />
                        ))}
                        <path
                            d="M-2.8 -2.8 L2.8 2.8 M2.8 -2.8 L-2.8 2.8"
                            stroke="#F7F1E8"
                            strokeWidth="1"
                            strokeLinecap="round"
                        />
                    </g>
                </g>
            ))}

            <path
                ref={glow}
                d={geo.d}
                fill="none"
                stroke="#F0A98B"
                strokeOpacity="0.14"
                strokeWidth="8"
                strokeLinecap="round"
                style={{ strokeDasharray: 100000, strokeDashoffset: 100000 }}
            />
            <path
                ref={path}
                d={geo.d}
                fill="none"
                stroke="#F0A98B"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ strokeDasharray: 100000, strokeDashoffset: 100000 }}
            />

            <g ref={needle} style={{ opacity: 0 }}>
                <g ref={needleRot}>
                    <path
                        d="M5 0 L42 0"
                        stroke="#F7F1E8"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        opacity="0.9"
                    />
                    <ellipse
                        cx="12"
                        cy="0"
                        rx="4.5"
                        ry="1.5"
                        fill="#0F1E2B"
                        stroke="#F7F1E8"
                        strokeWidth="1"
                    />
                </g>
                <circle className="sew-pulse" r="7" fill="#F0A98B" />
                <circle r="4.5" fill="#F0A98B" />
                <circle r="1.8" fill="#0F1E2B" />
            </g>
        </svg>
    );
});

const SPECKS = Array.from({ length: 16 }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    size: 2 + (i % 3),
    dur: 26 + ((i * 7) % 18),
    delay: -((i * 5) % 30),
    dx: ((i % 2) * 2 - 1) * (14 + (i % 4) * 6),
    o: 0.22 + (i % 3) * 0.1,
    c: i % 3 === 0 ? '#A9D3E6' : '#F7F1E8',
}));

const SewBackdrop = memo(function SewBackdrop({
    progress = 0,
}: {
    progress?: number;
}) {
    return (
        <div
            className="pointer-events-none absolute inset-0 z-0"
            aria-hidden="true"
        >
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(1400px 1000px at 50% 50%, transparent, rgba(6,17,22,0.28) 100%)',
                    WebkitMaskImage:
                        'linear-gradient(to bottom, transparent 0, #000 480px)',
                    maskImage:
                        'linear-gradient(to bottom, transparent 0, #000 480px)',
                }}
            />
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(700px 500px at ${20 + (progress % 60)}% ${10 + ((progress * 0.6) % 70)}%, rgba(169,211,230,0.06), transparent 60%)`,
                    WebkitMaskImage:
                        'linear-gradient(to bottom, transparent 0, #000 480px)',
                    maskImage:
                        'linear-gradient(to bottom, transparent 0, #000 480px)',
                }}
            />
            <div className="sew-glow absolute inset-0" />
            <div className="sew-grain absolute inset-0" />
            <div className="fixed inset-0 overflow-hidden">
                {SPECKS.map((s, i) => (
                    <span
                        key={i}
                        className="sew-speck"
                        style={
                            {
                                left: `${s.left}%`,
                                width: s.size,
                                height: s.size,
                                background: s.c,
                                '--d': `${s.dur}s`,
                                '--delay': `${s.delay}s`,
                                '--dx': `${s.dx}px`,
                                '--o': s.o,
                            } as CSSProperties
                        }
                    />
                ))}
            </div>
        </div>
    );
});

const HERO_GRAIN =
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const PageTexture = memo(function PageTexture() {
    return (
        <div
            className="pointer-events-none absolute inset-0 z-0"
            aria-hidden="true"
        >
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: HERO_GRAIN,
                    backgroundSize: '180px 180px',
                }}
            />
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(45deg, #F7F1E8 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, #F7F1E8 0 1px, transparent 1px 3px)',
                }}
            />
        </div>
    );
});

export default function Welcome({ services }: { services: any[] }) {
    const { auth }: any = usePage().props;
    const start = auth?.user ? '/dashboard' : '/register';

    const tagName = 'Wash, Dry & Fold';
    const tagTotal = '180';

    const shown = services.length > 0 ? services : LANDING_SERVICES;

    const [activeStep, setActiveStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const sew = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onScroll = () => {
            const h =
                document.documentElement.scrollHeight - window.innerHeight;
            setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const els = document.querySelectorAll('[data-step]');
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting)
                        setActiveStep(
                            Number(e.target.getAttribute('data-step')),
                        );
                });
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    return (
        <Shell bare>
            <div className="relative">
                <style>{`
                    @keyframes wow-up { from { transform: translateY(110%); } to { transform: translateY(0); } }
                    @keyframes wow-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
                    .wow-up { animation: wow-up 1s cubic-bezier(.2,.8,.2,1) both; }
                    .wow-draw { animation: wow-draw 1.4s cubic-bezier(.2,.7,.2,1) both; }
                    @media (prefers-reduced-motion: reduce) { .wow-up, .wow-draw { animation: none; } }
                `}</style>

                <PageTexture />

                <div
                    className="fixed top-0 left-0 z-50 h-0.5 bg-[#F0A98B]"
                    style={{ width: `${progress}%` }}
                />

                {/* HERO — scaled up so it fills the first screen like the reference, no gap below */}
                <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
                    <div
                        className="pointer-events-none absolute top-0 -left-32 h-96 w-96 rounded-full bg-[#5C8CA8]/20 blur-3xl"
                        aria-hidden="true"
                    />

                    <div className="relative z-10 mx-auto w-full max-w-6xl">
                        <p className="text-sm tracking-[0.3em] text-[#A9D3E6] uppercase md:text-base">
                            PhineWash <span className="text-[#F0A98B]">·</span>{' '}
                            Laundry Services
                        </p>

                        <h1
                            className="mt-6 font-serif leading-[1.05] text-[#F7F1E8]"
                            style={{
                                fontSize: 'clamp(3rem, min(7vw, 10vh), 6rem)',
                            }}
                        >
                            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                                <span className="block">Fresh, folded,</span>
                            </span>
                            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                                <span className="block text-[#F0A98B] italic">
                                    finished.
                                </span>
                            </span>
                        </h1>

                        <svg
                            viewBox="0 0 300 14"
                            fill="none"
                            className="mt-2 h-4 w-56 md:w-72"
                            aria-hidden="true"
                        >
                            <path
                                d="M3 9 C 50 2, 90 13, 140 7 S 230 3, 297 8"
                                stroke="#F0A98B"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeDasharray="9 8"
                            />
                        </svg>

                        <BlurText
                            className="mt-6 max-w-md text-base text-[#F7F1E8]/65 md:text-lg"
                            delay={1.2}
                            text="Kaya kong tanggalin ang mantsa, pero hindi ang alaala niya sa'yo."
                        />

                        <Magnetic>
                            <Link
                                href={start}
                                className="group mt-8 inline-flex items-center gap-3 border-b border-[#F7F1E8]/40 pb-1 text-lg text-[#F7F1E8] transition hover:border-[#F0A98B] hover:text-[#F0A98B] md:text-xl"
                            >
                                {auth?.user
                                    ? 'Go to dashboard'
                                    : 'Start an order'}
                                <span className="transition group-hover:translate-x-2">
                                    →
                                </span>
                            </Link>
                        </Magnetic>

                        <ul className="mt-12 grid gap-6 border-t border-[#F7F1E8]/20 pt-6 md:grid-cols-3 md:gap-8">
                            <li>
                                <SpotlightCard className="-m-3 rounded-xl p-3">
                                    <p className="font-serif text-xl text-[#F7F1E8] md:text-2xl">
                                        Fixed{' '}
                                        <span className="text-[#F0A98B] italic">
                                            per-load
                                        </span>
                                    </p>
                                    <p className="mt-2 text-sm text-[#F7F1E8]/65 md:text-base">
                                        ₱<CountUp to={180} /> for up to 8kg of
                                        regular clothes.
                                    </p>
                                </SpotlightCard>
                            </li>
                            <li>
                                <SpotlightCard className="-m-3 rounded-xl p-3">
                                    <p className="font-serif text-xl text-[#F7F1E8] md:text-2xl">
                                        Track every{' '}
                                        <span className="text-[#F0A98B] italic">
                                            step
                                        </span>
                                    </p>
                                    <p className="mt-2 text-sm text-[#F7F1E8]/65 md:text-base">
                                        From pending to ready, right on your
                                        phone.
                                    </p>
                                </SpotlightCard>
                            </li>
                            <li>
                                <SpotlightCard className="-m-3 rounded-xl p-3">
                                    <p className="font-serif text-xl text-[#F7F1E8] md:text-2xl">
                                        Pickup &{' '}
                                        <span className="text-[#F0A98B] italic">
                                            delivery
                                        </span>
                                    </p>
                                    <p className="mt-2 text-sm text-[#F7F1E8]/65 md:text-base">
                                        From ₱<CountUp to={20} /> depending on
                                        distance.
                                    </p>
                                </SpotlightCard>
                            </li>
                        </ul>
                    </div>
                </section>

                <div ref={sew} className="relative isolate overflow-x-clip">
                    <SewBackdrop progress={progress} />
                    <SewThread wrap={sew} />

                    <section
                        id="features"
                        className="relative scroll-mt-24 px-6 py-12"
                    >
                        <div
                            className="pointer-events-none absolute top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
                            style={{
                                background:
                                    'radial-gradient(closest-side, rgba(169,211,230,0.08), transparent)',
                            }}
                            aria-hidden="true"
                        />
                        <div className="relative mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
                            <div className="md:sticky md:top-20 md:self-start">
                                <Reveal>
                                    <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                                        How it works
                                    </p>
                                    <h2 className="mt-4 font-serif text-5xl text-[#F7F1E8] md:text-6xl">
                                        Follow your{' '}
                                        <span className="text-[#F0A98B] italic">
                                            tag.
                                        </span>
                                    </h2>
                                </Reveal>
                                <div className="relative mt-6 flex justify-center md:justify-start md:pl-10">
                                    <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0A98B]/10 blur-3xl md:left-[calc(2.5rem+8rem)]" />
                                    <div className="swing">
                                        <Tag
                                            step={activeStep}
                                            name={tagName}
                                            total={tagTotal}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                {steps.map(([n, title, text], i) => (
                                    <div
                                        key={n}
                                        data-step={i}
                                        className="flex min-h-[40vh] items-center"
                                    >
                                        <Reveal>
                                            <div
                                                className={`border-t pt-6 transition-colors duration-500 ${i === activeStep ? 'border-[#F0A98B]' : 'border-[#F7F1E8]/20'}`}
                                            >
                                                <p className="text-xs tracking-widest text-[#A9D3E6]">
                                                    {n}
                                                </p>
                                                <h3 className="mt-3 font-serif text-4xl text-[#F7F1E8]">
                                                    {title}
                                                </h3>
                                                <p className="mt-3 max-w-sm text-[#F7F1E8]/60">
                                                    {text}
                                                </p>
                                            </div>
                                        </Reveal>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section
                        id="pricing"
                        className="relative scroll-mt-24 px-6 py-24"
                    >
                        <div
                            className="pointer-events-none absolute top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
                            style={{
                                background:
                                    'radial-gradient(closest-side, rgba(240,169,139,0.08), transparent)',
                            }}
                            aria-hidden="true"
                        />
                        <div className="relative mx-auto max-w-6xl">
                            <Reveal className="text-center">
                                <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                                    Price list
                                </p>
                                <h2 className="mt-4 font-serif text-5xl text-[#F7F1E8] md:text-6xl">
                                    Simple,{' '}
                                    <span className="text-[#F0A98B] italic">
                                        honest
                                    </span>{' '}
                                    prices.
                                </h2>
                                <p className="mt-3 text-[#F7F1E8]/60">
                                    Fixed per load or per piece — you always see
                                    your total before you place an order.
                                </p>
                            </Reveal>

                            <div className="relative mt-20">
                                <div className="absolute top-0 right-0 left-0 h-0.5 bg-[#F7F1E8]/40" />
                                <div className="grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-4">
                                    {shown.map((s, i) => (
                                        <Drop key={s.id} delay={i * 180}>
                                            <div
                                                className="swing flex flex-col items-center"
                                                style={{
                                                    animationDuration: `${4 + i}s`,
                                                    animationDelay: `${i * 0.4}s`,
                                                }}
                                            >
                                                <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-[#F0A98B]" />
                                                <Tilt>
                                                    <div
                                                        className={`w-full max-w-[220px] rounded-2xl px-5 pt-8 pb-6 text-center text-[#0F1E2B] shadow-xl transition duration-300 hover:scale-105 ${i === 0 ? 'bg-[#F0A98B]' : 'bg-[#F7F1E8]'}`}
                                                    >
                                                        <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                                                        <p className="text-[10px] tracking-[0.25em] text-[#0F1E2B]/60 uppercase">
                                                            {i === 0
                                                                ? 'Most popular'
                                                                : 'Service'}
                                                        </p>
                                                        <p className="mt-2 text-sm font-semibold">
                                                            {s.name}
                                                        </p>
                                                        <p className="mt-3 font-serif text-5xl">
                                                            ₱
                                                            <CountUp
                                                                to={Number(
                                                                    s.price,
                                                                )}
                                                            />
                                                        </p>
                                                        <p className="text-xs text-[#0F1E2B]/60">
                                                            per {s.unit}
                                                        </p>
                                                        {s.note && (
                                                            <p className="mt-2 text-[11px] text-[#0F1E2B]/50">
                                                                {s.note}
                                                            </p>
                                                        )}
                                                        <Link
                                                            href={start}
                                                            className="mt-5 block border-t border-dashed border-[#0F1E2B]/30 pt-3 text-xs font-semibold tracking-widest uppercase hover:underline"
                                                        >
                                                            Order →
                                                        </Link>
                                                    </div>
                                                </Tilt>
                                            </div>
                                        </Drop>
                                    ))}
                                </div>
                            </div>

                            <Reveal>
                                <p className="mt-14 text-center text-sm text-[#F7F1E8]/60">
                                    Comforters are washed separately because of
                                    their weight. {SHOP.pickupNote}
                                </p>
                            </Reveal>
                        </div>
                    </section>

                    <section
                        id="find-us"
                        className="relative scroll-mt-24 px-6 py-24"
                    >
                        <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
                            <Reveal>
                                <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                                    Find us
                                </p>
                                <h2 className="mt-3 font-serif text-5xl text-[#F7F1E8] md:text-6xl">
                                    Drop by{' '}
                                    <span className="text-[#F0A98B] italic">
                                        the shop
                                    </span>
                                </h2>
                                <dl className="mt-8 space-y-5 text-[#F7F1E8]">
                                    <div>
                                        <dt className="text-xs tracking-[0.25em] text-[#A9D3E6]/70 uppercase">
                                            Address
                                        </dt>
                                        <dd className="mt-1">{SHOP.address}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs tracking-[0.25em] text-[#A9D3E6]/70 uppercase">
                                            Hours
                                        </dt>
                                        <dd className="mt-1">{SHOP.hours}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs tracking-[0.25em] text-[#A9D3E6]/70 uppercase">
                                            Phone
                                        </dt>
                                        <dd className="mt-1">
                                            <a
                                                href={`tel:${SHOP.phone.replace(/\s/g, '')}`}
                                                className="hover:text-[#F0A98B]"
                                            >
                                                {SHOP.phone}
                                            </a>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs tracking-[0.25em] text-[#A9D3E6]/70 uppercase">
                                            Pickup & delivery
                                        </dt>
                                        <dd className="mt-1">
                                            {SHOP.pickupNote}
                                        </dd>
                                    </div>
                                </dl>
                                <Magnetic>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP.mapQuery)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-8 inline-block rounded-full bg-[#F7F1E8] px-8 py-4 font-semibold text-[#0F1E2B] shadow-lg shadow-black/30 transition hover:-translate-y-0.5 hover:bg-[#F0A98B]"
                                    >
                                        Get directions
                                    </a>
                                </Magnetic>
                            </Reveal>

                            <Reveal>
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="z-10 -mb-3 h-8 w-3 rounded-sm bg-[#F0A98B]" />
                                    <div className="w-full max-w-sm rounded-3xl bg-[#F7F1E8] p-6 pt-8 text-[#0F1E2B] shadow-2xl shadow-black/40">
                                        <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                                        <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-[#0F1E2B]/15 bg-[#EFE7D8]">
                                            <iframe
                                                title={`${SHOP.name} location`}
                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(SHOP.mapQuery)}&z=16&output=embed`}
                                                className="absolute left-0 w-full"
                                                style={{
                                                    top: '-52px',
                                                    height: 'calc(100% + 52px)',
                                                    border: 0,
                                                    filter: 'saturate(0.72) brightness(0.96) contrast(0.98)',
                                                }}
                                                loading="lazy"
                                                allowFullScreen
                                                referrerPolicy="no-referrer-when-downgrade"
                                            />
                                            <div
                                                className="pointer-events-none absolute right-0 bottom-0 h-24 w-24"
                                                style={{
                                                    background:
                                                        'linear-gradient(315deg, #F7F1E8 55%, transparent 100%)',
                                                }}
                                                aria-hidden="true"
                                            />
                                            <div
                                                className="pointer-events-none absolute inset-0 mix-blend-multiply"
                                                style={{
                                                    background:
                                                        'linear-gradient(180deg, rgba(247,241,232,0.18), rgba(240,169,139,0.08))',
                                                }}
                                                aria-hidden="true"
                                            />
                                            <div
                                                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#0F1E2B]/10 ring-inset"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <p className="mt-4 text-xs tracking-[0.3em] text-[#0F1E2B]/60 uppercase">
                                            {SHOP.name}
                                        </p>
                                        <p className="mt-1 text-sm text-[#0F1E2B]/70">
                                            Visit us in Poblacion, Anahawan.
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    <section
                        id="about"
                        className="relative scroll-mt-24 px-6 py-28 text-center"
                    >
                        <div
                            className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                            style={{
                                background:
                                    'radial-gradient(closest-side, rgba(240,169,139,0.10), transparent)',
                            }}
                            aria-hidden="true"
                        />
                        <Reveal>
                            <h2 className="relative mx-auto max-w-2xl font-serif text-5xl leading-tight text-[#F7F1E8] md:text-7xl">
                                Clean clothes,{' '}
                                <span className="text-[#F0A98B] italic">
                                    zero fuss.
                                </span>
                            </h2>
                            <p className="relative mx-auto mt-4 max-w-sm text-[#F7F1E8]/60">
                                Book online in a minute and follow your laundry
                                all the way to pickup.
                            </p>
                            <Magnetic className="relative">
                                <Link
                                    href={start}
                                    className="mt-10 inline-block rounded-full bg-[#F7F1E8] px-8 py-4 font-semibold text-[#0F1E2B] transition hover:-translate-y-0.5 hover:bg-[#F0A98B]"
                                >
                                    Place your first order
                                </Link>
                            </Magnetic>
                        </Reveal>
                    </section>

                    <footer className="border-t border-[#F7F1E8]/10 px-6 py-8 text-center text-xs text-[#F7F1E8]/40">
                        © 2026 {SHOP.name} · Wash. Dry. Fold. · Pickup and
                        delivery available
                    </footer>
                </div>
            </div>
        </Shell>
    );
}
