import { createInertiaApp } from '@inertiajs/react';
import PageLoader from '@/components/PageLoader';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name.toLowerCase() === 'welcome':
            case name.startsWith('Orders/'):
            case name.startsWith('Admin/'):
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return SettingsLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <PageLoader />
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    // the PageLoader replaces the grey top progress bar
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
