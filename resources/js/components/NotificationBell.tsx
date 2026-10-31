import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type Item = {
    id: string;
    title: string;
    body: string;
    url: string | null;
    read: boolean;
    at: string;
};

const ago = (iso: string) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
    return `${Math.floor(s / 86400)} d ago`;
};

// The bell in the top bar. Shows unread count, refreshes itself every 30 seconds.
export default function NotificationBell() {
    const { notifications }: any = usePage().props;
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = setInterval(() => {
            if (!document.hidden)
                router.reload({
                    only: ['notifications'],
                });
        }, 10000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!open) return;
        const away = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node))
                setOpen(false);
        };
        const esc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);

    if (!notifications) return null;

    const items: Item[] = notifications.items ?? [];
    const unread: number = notifications.unread ?? 0;

    const openItem = (n: Item) => {
        setOpen(false);
        const go = () => {
            if (n.url) router.visit(n.url);
        };
        if (n.read) return go();
        router.post(
            `/notifications/${n.id}/read`,
            {},
            { preserveScroll: true, onFinish: go },
        );
    };

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={
                    unread ? `Notifications, ${unread} unread` : 'Notifications'
                }
                aria-expanded={open}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-pw-cream/70 transition hover:bg-pw-cream/10 hover:text-pw-peach"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pw-peach px-1 text-xs font-bold text-pw-navy">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-2xl bg-pw-cream text-pw-ink shadow-2xl ring-1 ring-pw-ink/10 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-3 sm:w-80">
                    <div className="flex items-center justify-between border-b border-pw-ink/10 px-4 py-3">
                        <p className="text-xs tracking-[0.18em] text-pw-ink/70 uppercase">
                            Notifications
                        </p>
                        {unread > 0 && (
                            <button
                                onClick={() =>
                                    router.post(
                                        '/notifications/read-all',
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                                className="text-xs font-semibold text-pw-rust hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-pw-ink/70">
                            Nothing yet. We'll tell you when something happens.
                        </p>
                    ) : (
                        <ul className="max-h-[60vh] divide-y divide-pw-ink/10 overflow-y-auto sm:max-h-96">
                            {items.map((n) => (
                                <li key={n.id}>
                                    <button
                                        onClick={() => openItem(n)}
                                        className={`block w-full px-4 py-3 text-left transition hover:bg-pw-ink/5 ${n.read ? '' : 'bg-pw-peach/15'}`}
                                    >
                                        <span className="flex items-start gap-2">
                                            {!n.read && (
                                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pw-clay" />
                                            )}
                                            <span className="min-w-0 break-words">
                                                <span className="block text-sm font-semibold">
                                                    {n.title}
                                                </span>
                                                <span className="block text-xs text-pw-ink/70">
                                                    {n.body}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-pw-ink/70">
                                                    {ago(n.at)}
                                                </span>
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
