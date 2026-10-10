import { router } from '@inertiajs/react';

type Tab = { key: string; label: string; count: number };

const visit = (url: string, data: Record<string, string | number>) =>
    router.get(url, data, { preserveScroll: true, preserveState: true, replace: true });

// Ongoing / Finished tabs. The server does the filtering, so only the current tab is loaded.
export function OrderViewTabs({ url, tabs, current }: { url: string; tabs: Tab[]; current: string }) {
    return (
        <div className="mt-10 flex flex-wrap gap-2" role="tablist">
            {tabs.map((t) => {
                const on = t.key === current;
                return (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={on}
                        onClick={() => !on && visit(url, { view: t.key })}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                            on
                                ? 'bg-[#F7F1E8] text-[#0F1E2B]'
                                : 'border border-[#F7F1E8]/25 text-[#F7F1E8]/70 hover:bg-[#F7F1E8]/10'
                        }`}
                    >
                        {t.label} <span className={on ? 'text-[#0F1E2B]/60' : 'text-[#F7F1E8]/45'}>{t.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// "Load more" for the Finished / Archived tabs (10 at a time).
export function LoadMore({ url, view, nextLimit, show }: { url: string; view: string; nextLimit: number; show: boolean }) {
    if (!show) return null;
    return (
        <div className="mt-6 text-center">
            <button
                onClick={() => visit(url, { view, limit: nextLimit })}
                className="rounded-full border border-[#F7F1E8]/25 px-6 py-2 text-sm font-semibold text-[#F7F1E8] transition hover:bg-[#F7F1E8]/10"
            >
                Load more
            </button>
        </div>
    );
}
