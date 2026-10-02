import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import Flash from '@/components/Flash';


export default function Shell({ children, bare = false }: PropsWithChildren<{ bare?: boolean }>) {
    const page = usePage();
    const { auth }: any = page.props;
    const user = auth?.user;
    const path = page.url.split('?')[0];

    // /admin and /orders only match exactly so "New Order" doesn't light up two links
    const active = (href: string) =>
        path === href || (href !== '/admin' && href !== '/orders' && path.startsWith(href));
    const link = (href: string) =>
        `text-sm transition hover:text-[#F0A98B] ${active(href) ? 'text-[#F0A98B]' : 'text-[#F7F1E8]/70'}`;
    const plain = 'text-sm text-[#F7F1E8]/70 transition hover:text-[#F0A98B]';

    return (
        <div className="relative min-h-screen bg-[#0B1F26] text-[#F7F1E8]">
            {/* global grain + vignette — sits behind everything, applies to every page */}
            <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(1200px 800px at 15% 10%, rgba(92,140,168,0.08), transparent 60%),' +
                            'radial-gradient(900px 700px at 85% 85%, rgba(240,169,139,0.05), transparent 60%),' +
                            'radial-gradient(1400px 1000px at 50% 50%, rgba(15,30,43,0), rgba(9,18,26,0.35) 100%)',
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                        backgroundSize: '180px 180px',
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.035]"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(45deg, #F7F1E8 0 1px, transparent 1px 3px),' +
                            'repeating-linear-gradient(-45deg, #F7F1E8 0 1px, transparent 1px 3px)',
                    }}
                />
            </div>

            <nav className="sticky top-0 z-30 border-b border-[#F7F1E8]/10 bg-[#0B1F26]/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-6 py-4 md:grid md:grid-cols-[1fr_auto_1fr]">
                    <Link href="/" className="flex items-center gap-2 font-serif text-xl text-[#F7F1E8]">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0A98B] font-sans text-sm font-black text-[#0B1F26]">S</span>
                        Sinabunan.
                    </Link>

                    <div className="order-3 flex w-full items-center justify-center gap-6 md:order-none md:w-auto md:gap-8">
                        {user?.role === 'admin' ? (
                            <>
                                <Link href="/admin" className={link('/admin')}>Orders</Link>
                                <Link href="/admin/customers" className={link('/admin/customers')}>Customers</Link>
                                <Link href="/admin/services" className={link('/admin/services')}>Pricing</Link>
                            </>
                        ) : user ? (
                            <>
                                <Link href="/orders" className={link('/orders')}>My Orders</Link>
                                <Link href="/orders/create" className={link('/orders/create')}>New Order</Link>
                                <Link href="/settings/profile" className={link('/settings')}>Settings</Link>
                            </>
                        ) : (
                            <>
                                <a href="/#about" className={plain}>About</a>
                                <a href="/#features" className={plain}>Features</a>
                                <a href="/#pricing" className={plain}>Pricing</a>
                                <a href="/#find-us" className={plain}>Find us</a>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-self-end gap-5">
                        {user ? (
                            <>
                                {user.role === 'admin' && <Link href="/settings/profile" className={link('/settings')}>Settings</Link>}
                                <Link href="/logout" method="post" as="button" className={plain}>Logout</Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className={plain}>Login</Link>
                                <Link href="/register" className="rounded-full border border-[#F7F1E8]/20 bg-[#F7F1E8]/10 px-5 py-2 text-sm text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0B1F26]">
                                    Get started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>
            <Flash />
            <div className="relative z-10">
                {bare ? children : <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>}
            </div>
        </div>
    );
}