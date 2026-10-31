import { Link } from '@inertiajs/react';
import {
    ClipboardList,
    History,
    LayoutDashboard,
    Plus,
    Settings,
    Tag,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

type Item = {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    primary?: boolean;
    exact?: boolean;
};

const CUSTOMER: Item[] = [
    { href: '/orders', label: 'My Orders', icon: ClipboardList, exact: true },
    { href: '/orders/create', label: 'New order', icon: Plus, primary: true },
    { href: '/settings/profile', label: 'Settings', icon: Settings },
];

const ADMIN: Item[] = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/customers', label: 'Customers', icon: Users },
    { href: '/admin/services', label: 'Pricing', icon: Tag },
    { href: '/admin/history', label: 'History', icon: History },
];

// The cashier: the order desk, a quick way to add a walk-in order, and their own settings.
const STAFF: Item[] = [
    { href: '/admin', label: 'Orders', icon: LayoutDashboard, exact: true },
    { href: '/admin/walk-in', label: 'Walk-in', icon: Plus, primary: true },
    { href: '/settings/profile', label: 'Settings', icon: Settings },
];

// Thumb-reach navigation for phones. Hidden from tablet width up, where the top bar has room.
export default function MobileTabBar({
    role,
    path,
}: {
    role: string;
    path: string;
}) {
    const items = role === 'admin' ? ADMIN : role === 'staff' ? STAFF : CUSTOMER;
    const isActive = (it: Item) =>
        it.exact ? path === it.href : path.startsWith(it.href);

    return (
        <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-pw-cream/10 bg-pw-navy md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
                {items.map((it) => {
                    const on = isActive(it);
                    const Icon = it.icon;

                    return (
                        <li key={it.href} className="flex-1">
                            <Link
                                href={it.href}
                                aria-current={on ? 'page' : undefined}
                                className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-xs transition-colors duration-200"
                            >
                                {it.primary ? (
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pw-peach text-pw-navy">
                                        <Icon className="h-5 w-5" aria-hidden />
                                    </span>
                                ) : (
                                    <Icon
                                        className={`h-5 w-5 ${on ? 'text-pw-peach' : 'text-pw-cream/70'}`}
                                        aria-hidden
                                    />
                                )}
                                <span
                                    className={
                                        on
                                            ? 'font-semibold text-pw-peach'
                                            : 'text-pw-cream/70'
                                    }
                                >
                                    {it.label}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
