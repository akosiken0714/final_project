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
    const isAdmin = auth?.user?.role === 'admin';

    return (
        <Shell>
            <p className="text-xs tracking-[0.3em] text-[#A9D3E6] uppercase">
                {isAdmin ? 'Admin account' : 'Account'}
            </p>
            <h1 className="mt-3 font-serif text-5xl md:text-6xl">
                {isAdmin ? 'Admin ' : 'Your '}
                <span className="text-[#F0A98B] italic">settings</span>
            </h1>

            <nav
                className="mt-8 flex gap-6 border-b border-[#F7F1E8]/15"
                aria-label="Settings"
            >
                {tabs.map((tab) => (
                    <Link
                        key={toUrl(tab.href)}
                        href={tab.href}
                        className={`-mb-px border-b-2 pb-3 text-sm transition ${
                            isCurrentOrParentUrl(tab.href)
                                ? 'border-[#F0A98B] text-[#F7F1E8]'
                                : 'border-transparent text-[#F7F1E8]/50 hover:text-[#F7F1E8]'
                        }`}
                    >
                        {tab.title}
                    </Link>
                ))}
            </nav>

            <div className="mt-8 max-w-2xl rounded-[2rem] bg-[#F7F1E8] p-8 text-[#0F1E2B] shadow-2xl">
                <section className="space-y-12">{children}</section>
            </div>
        </Shell>
    );
}
