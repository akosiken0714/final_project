import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

function SewnButton({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
            <circle cx="60" cy="62" r="46" fill="#000" fillOpacity="0.28" />
            <circle cx="60" cy="60" r="46" fill="#F0A98B" />
            <circle
                cx="60"
                cy="60"
                r="35"
                fill="none"
                stroke="#0F1E2B"
                strokeOpacity="0.28"
                strokeWidth="2"
            />
            {[
                [-10, -10],
                [10, -10],
                [-10, 10],
                [10, 10],
            ].map(([dx, dy]) => (
                <circle
                    key={`${dx}${dy}`}
                    cx={60 + dx}
                    cy={60 + dy}
                    r="5"
                    fill="#0B1F26"
                />
            ))}
            <path
                d="M50 50 L70 70 M70 50 L50 70"
                stroke="#F7F1E8"
                strokeWidth="3.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const words = (title ?? '').split(' ');
    const lastWord = words.pop();
    const firstWords = words.join(' ');

    return (
        <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#0B1F26] text-[#F7F1E8]">
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(1000px 700px at 12% 35%, rgba(92,140,168,0.22), transparent 65%)',
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(45deg, #F7F1E8 0 1px, transparent 1px 6px)',
                    }}
                />
            </div>

            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
                <Link
                    href={home()}
                    className="text-sm text-[#F7F1E8]/60 transition hover:text-[#F0A98B]"
                >
                    ← Back to home
                </Link>
                <span className="font-serif text-xl">
                    PhineWash<span className="text-[#F0A98B] italic">.</span>
                </span>
            </header>

            <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-14 px-6 pt-4 pb-16 lg:grid-cols-[1fr_29rem] lg:gap-20">
                <section>
                    <h1
                        className="font-serif leading-[0.95] tracking-tight"
                        style={{ fontSize: 'clamp(3.25rem, 9vw, 8.5rem)' }}
                    >
                        {firstWords && (
                            <span className="block">{firstWords}</span>
                        )}
                        <span className="block text-[#F0A98B] italic">
                            {lastWord}
                        </span>
                    </h1>

                    <svg
                        viewBox="0 0 300 14"
                        fill="none"
                        className="mt-4 h-4 w-56 md:w-72"
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

                    {description && (
                        <p className="mt-6 max-w-sm text-base text-[#F7F1E8]/65 md:text-lg">
                            {description}
                        </p>
                    )}
                </section>

                <div className="relative">
                    <SewnButton className="absolute -top-8 -left-5 z-10 h-20 w-20 md:-left-8 md:h-24 md:w-24" />
                    <div className="auth-panel relative w-full rounded-[1.75rem] bg-[#F7F1E8] p-10 pt-14 text-[#0F1E2B] shadow-2xl">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
