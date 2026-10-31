import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Shell from '@/components/Shell';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

const tabs = [
    { title: 'Profile', href: edit() },
    { title: 'Security', href: editSecurity() },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth }: any = usePage().props;
    // Admins and staff both run the shop, so they get the "shop account" wording.
    const isAdmin = auth?.user?.role === 'admin' || auth?.user?.role === 'staff';

    return (
        <Shell>
            <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                {auth?.user?.role === 'staff' ? 'Staff account' : isAdmin ? 'Admin account' : 'Account'}
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                {auth?.user?.role === 'staff' ? 'Staff ' : isAdmin ? 'Admin ' : 'Your '}
                <span className="text-pw-peach italic">settings</span>
            </h1>

            <nav
                className="mt-8 flex gap-6 border-b border-pw-cream/15"
                aria-label="Settings"
            >
                {tabs.map((tab) => (
                    <Link
                        key={toUrl(tab.href)}
                        href={tab.href}
                        className={`-mb-px border-b-2 pb-3 text-sm transition ${
                            isCurrentOrParentUrl(tab.href)
                                ? 'border-pw-peach text-pw-cream'
                                : 'border-transparent text-pw-cream/65 hover:text-pw-cream'
                        }`}
                    >
                        {tab.title}
                    </Link>
                ))}
            </nav>

            <div className="mt-8 max-w-2xl rounded-[2rem] bg-pw-cream p-8 text-pw-ink shadow-2xl">
                <section className="space-y-12">{children}</section>
            </div>
        </Shell>
    );
}
