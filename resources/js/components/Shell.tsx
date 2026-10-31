import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, useEffect, useState } from 'react';
import Flash from '@/components/Flash';
import MobileTabBar from '@/components/MobileTabBar';
import NotificationBell from '@/components/NotificationBell';
import UserAvatar from '@/components/UserAvatar';

export default function Shell({
    children,
    bare = false,
}: PropsWithChildren<{ bare?: boolean }>) {
    const page = usePage();
    const { auth }: any = page.props;
    const user = auth?.user;
    const path = page.url.split('?')[0];

    // /admin and /orders only match exactly so "New Order" doesn't light up two links
    const active = (href: string) =>
        path === href ||
        (href !== '/admin' && href !== '/orders' && path.startsWith(href));
    const link = (href: string) =>
        `relative py-2 text-sm transition-colors duration-150 ${active(href) ? 'text-pw-cream after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-pw-peach' : 'text-pw-cream/70 hover:text-pw-peach'}`;
    const plain =
        'py-2 text-sm text-pw-cream/70 transition-colors duration-150 hover:text-pw-peach';

    // Landing page only: highlight the nav link for the section currently on screen.
    const [section, setSection] = useState('');
    useEffect(() => {
        if (user || path !== '/') {
            setSection('');
            return;
        }
        const ids = ['features', 'pricing', 'faq', 'find-us', 'about'];
        let raf = 0;
        const update = () => {
            raf = 0;
            let current = '';
            for (const id of ids) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= 140) current = id;
            }
            setSection(current);
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [user, path]);
    const anchor = (id: string) =>
        `relative py-2 text-sm transition-colors duration-150 ${section === id ? 'text-pw-cream after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-pw-peach' : 'text-pw-cream/70 hover:text-pw-peach'}`;

    return (
        <div className="relative min-h-screen bg-pw-navy text-pw-cream">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-pw-peach focus:px-4 focus:py-2 focus:text-pw-navy"
            >
                Skip to content
            </a>
            {/* global grain + vignette — sits behind everything, applies to every page */}
            <div
                className="pointer-events-none fixed inset-0 z-0"
                aria-hidden="true"
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(900px 600px at 92% 0%, rgba(240,169,139,0.07), transparent 60%),' +
                            'radial-gradient(1200px 800px at 15% 10%, rgba(92,140,168,0.08), transparent 60%),' +
                            'radial-gradient(1400px 1000px at 50% 50%, transparent, rgba(6,17,22,0.28) 100%)',
                    }}
                />
                <div
                    className="absolute inset-0 hidden opacity-[0.05] mix-blend-overlay md:block"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                        backgroundSize: '180px 180px',
                    }}
                />
                <div
                    className="absolute inset-0 hidden opacity-[0.02] md:block"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(45deg, #F7F1E8 0 1px, transparent 1px 3px),' +
                            'repeating-linear-gradient(-45deg, #F7F1E8 0 1px, transparent 1px 3px)',
                    }}
                />
            </div>

            <nav className="sticky top-0 z-30 border-b border-pw-cream/10 bg-pw-navy/95 md:bg-pw-navy/90 md:backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-6 py-4 md:grid md:grid-cols-[1fr_auto_1fr]">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-serif text-xl text-pw-cream"
                    >
                        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-pw-peach/15 p-0.5 ring-1 ring-pw-peach/25">
                            <img
                                src="/images/logo.jpg"
                                alt="PhineWash Laundry Services"
                                className="h-full w-full rounded-md object-cover"
                                style={{
                                    filter: 'sepia(0.55) hue-rotate(-15deg) saturate(0.9) brightness(1.08) contrast(0.95)',
                                }}
                            />
                        </span>
                        PhineWash.
                    </Link>

                    <div
                        className={`order-3 w-full items-center justify-center gap-6 md:order-none md:flex md:w-auto md:gap-8 ${user ? 'hidden' : 'flex'}`}
                    >
                        {user?.role === 'staff' ? (
                            <>
                                <Link href="/admin" className={link('/admin')}>
                                    Orders
                                </Link>
                                <Link
                                    href="/admin/walk-in"
                                    className={link('/admin/walk-in')}
                                >
                                    Walk-in
                                </Link>
                                <Link
                                    href="/settings/profile"
                                    className={link('/settings')}
                                >
                                    Settings
                                </Link>
                            </>
                        ) : user?.role === 'admin' ? (
                            <>
                                <Link href="/admin" className={link('/admin')}>
                                    Dashboard
                                </Link>
                                <Link
                                    href="/admin/customers"
                                    className={link('/admin/customers')}
                                >
                                    Customers
                                </Link>
                                <Link
                                    href="/admin/services"
                                    className={link('/admin/services')}
                                >
                                    Pricing
                                </Link>
                                <Link
                                    href="/admin/history"
                                    className={link('/admin/history')}
                                >
                                    History
                                </Link>
                            </>
                        ) : user ? (
                            <>
                                <Link
                                    href="/orders"
                                    className={link('/orders')}
                                >
                                    My Orders
                                </Link>
                                <Link
                                    href="/orders/create"
                                    className={link('/orders/create')}
                                >
                                    New Order
                                </Link>
                                <Link
                                    href="/settings/profile"
                                    className={link('/settings')}
                                >
                                    Settings
                                </Link>
                            </>
                        ) : (
                            <>
                                <a
                                    href="/#about"
                                    className={anchor('about')}
                                    aria-current={section === 'about' ? 'true' : undefined}
                                >
                                    About
                                </a>
                                <a
                                    href="/#features"
                                    className={anchor('features')}
                                    aria-current={section === 'features' ? 'true' : undefined}
                                >
                                    Features
                                </a>
                                <a
                                    href="/#pricing"
                                    className={anchor('pricing')}
                                    aria-current={section === 'pricing' ? 'true' : undefined}
                                >
                                    Pricing
                                </a>
                                <a
                                    href="/#faq"
                                    className={anchor('faq')}
                                    aria-current={section === 'faq' ? 'true' : undefined}
                                >
                                    FAQ
                                </a>
                                <a
                                    href="/#find-us"
                                    className={anchor('find-us')}
                                    aria-current={section === 'find-us' ? 'true' : undefined}
                                >
                                    Find us
                                </a>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-5 justify-self-end">
                        {user ? (
                            <>
                                <NotificationBell />
                                <Link
                                    href="/settings/profile"
                                    aria-label="Your profile and settings"
                                    title="Profile & settings"
                                    className="flex items-center gap-2"
                                >
                                    <UserAvatar user={user} size={34} />
                                    <span
                                        className={`hidden max-w-[120px] truncate lg:inline ${link('/settings')}`}
                                    >
                                        {user.name.split(' ')[0]}
                                    </span>
                                </Link>
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className={plain}
                                >
                                    Logout
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={plain}>
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="rounded-full border border-pw-cream/20 bg-pw-cream/10 px-5 py-2 text-sm text-pw-cream transition hover:bg-pw-peach hover:text-pw-navy"
                                >
                                    Get started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>
            <Flash />
            <div
                id="main"
                tabIndex={-1}
                className={`relative z-10 outline-none ${user ? 'pb-20 md:pb-0' : ''}`}
            >
                {bare ? (
                    children
                ) : (
                    <main className="pw-enter mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-14">
                        {children}
                    </main>
                )}
            </div>
            {user && (
                <MobileTabBar role={user.role} path={path} />
            )}
        </div>
    );
}