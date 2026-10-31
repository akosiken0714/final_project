import { router } from '@inertiajs/react';

type Tab = { key: string; label: string; count: number };

// Keeps the active search and filters (?q, status, pay, from, to) when switching tabs or loading more.
const KEEP = ['q', 'status', 'pay', 'from', 'to'];

const visit = (url: string, data: Record<string, string | number>) => {
    const params: Record<string, string | number> = { ...data };

    if (typeof window !== 'undefined') {
        const now = new URLSearchParams(window.location.search);
        KEEP.forEach((k) => {
            const v = now.get(k);
            if (v) params[k] = v;
        });
    }

    router.get(url, params, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
    });
};

// Ongoing / Finished (and, for the admin, Cancelled) tabs. The server does the filtering, so only the current tab is loaded.
export function OrderViewTabs({
    url,
    tabs,
    current,
}: {
    url: string;
    tabs: Tab[];
    current: string;
}) {
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
                                ? 'bg-pw-cream text-pw-ink'
                                : 'border border-pw-cream/25 text-pw-cream/70 hover:bg-pw-cream/10'
                        }`}
                    >
                        {t.label}{' '}
                        <span
                            className={
                                on ? 'text-pw-ink/70' : 'text-pw-cream/65'
                            }
                        >
                            {t.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// "Load more" for the Finished / Archived tabs (10 at a time).
export function LoadMore({
    url,
    view,
    nextLimit,
    show,
}: {
    url: string;
    view: string;
    nextLimit: number;
    show: boolean;
}) {
    if (!show) return null;
    return (
        <div className="mt-6 text-center">
            <button
                onClick={() => visit(url, { view, limit: nextLimit })}
                className="rounded-full border border-pw-cream/25 px-6 py-2 text-sm font-semibold text-pw-cream transition hover:bg-pw-cream/10"
            >
                Load more
            </button>
        </div>
    );
}
