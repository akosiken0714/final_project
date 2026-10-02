import { Head, Link } from '@inertiajs/react';
import Shell from '@/components/Shell';

const copy: Record<number, [string, string]> = {
    403: ['Off limits', "You don't have access to this page."],
    404: ['Lost sock', "We couldn't find that page."],
    500: ['Spin cycle stuck', 'Something went wrong on our side. Please try again.'],
    503: ['Back soon', "We're doing a quick clean-up. Try again shortly."],
};

export default function ErrorPage({ status }: { status: number }) {
    const [title, text] = copy[status] ?? copy[500];
    return (
        <Shell>
            <Head title={String(status)} />
            <div className="hang mx-auto flex max-w-md flex-col items-center text-center">
                <div className="z-10 h-8 w-3 rounded-sm bg-[#F0A98B]" />
                <div className="-mt-1 h-8 w-px bg-[#F7F1E8]/40" />
                <div className="w-full rounded-3xl bg-[#F7F1E8] p-10 text-[#0F1E2B] shadow-2xl">
                    <div className="mx-auto mb-4 h-3 w-3 rounded-full border-2 border-[#0F1E2B]/40" />
                    <p className="text-xs uppercase tracking-[0.3em] text-[#0F1E2B]/60">Error {status}</p>
                    <p className="mt-2 font-serif text-5xl">{title}</p>
                    <p className="mt-3 text-[#0F1E2B]/70">{text}</p>
                    <Link href="/" className="mt-8 inline-block rounded-full bg-[#0F1E2B] px-8 py-3 font-semibold text-[#F7F1E8] transition hover:bg-[#F0A98B] hover:text-[#0F1E2B]">
                        Back home
                    </Link>
                </div>
            </div>
        </Shell>
    );
}