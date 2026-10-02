import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const words = (title ?? '').split(' ');
    const lastWord = words.pop();
    const firstWords = words.join(' ');

    return (
        <div className="relative flex min-h-svh flex-col items-center overflow-hidden bg-[#0B1F26] px-6 pb-16 text-[#F7F1E8]">
            <div className="float pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-[#5C8CA8]/25 blur-3xl" />
            <div
                className="float pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#F0A98B]/10 blur-3xl"
                style={{ animationDelay: '-3s' }}
            />

            <header className="relative z-10 w-full max-w-6xl py-6">
                <Link
                    href={home()}
                    className="text-sm text-[#F7F1E8]/60 transition hover:text-[#F0A98B]"
                >
                    ← Sinabunan Laundry Shop
                </Link>
            </header>

            <div className="relative z-10 mt-2 w-full">
                <div className="h-0.5 w-full bg-[#F7F1E8]/40" />

                <div className="mx-auto w-full max-w-sm">
                    <div className="hang flex flex-col items-center">
                        <div className="z-10 -mt-3 h-8 w-3 rounded-sm bg-[#F0A98B]" />
                        <div className="-mt-1 h-10 w-px bg-[#F7F1E8]/40" />

                        <div className="auth-tag w-full rounded-3xl bg-[#F7F1E8] px-8 pb-8 pt-6 text-[#0F1E2B] shadow-2xl">
                            <div className="mx-auto mb-5 h-4 w-4 rounded-full border-2 border-[#0F1E2B]/40" />

                            <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[#0F1E2B]/50">
                                Order tag
                            </p>
                            <h1 className="mt-2 text-center font-serif text-4xl leading-tight">
                                {firstWords && <>{firstWords} </>}
                                <span className="italic text-[#E58A63]">
                                    {lastWord}
                                </span>
                            </h1>
                            {description && (
                                <p className="mt-3 text-center text-sm text-[#0F1E2B]/60">
                                    {description}
                                </p>
                            )}

                            <div className="mt-8">{children}</div>

                            <div
                                className="mt-8 flex gap-1.5 border-t border-dashed border-[#0F1E2B]/25 pt-5"
                                aria-hidden="true"
                            >
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="h-1 flex-1 overflow-hidden rounded-full bg-[#0F1E2B]/15"
                                    >
                                        <div
                                            className="tagbar h-full w-full bg-[#F0A98B]"
                                            style={{
                                                animationDelay: `${1.2 + i * 0.3}s`,
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}