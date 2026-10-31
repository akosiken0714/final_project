import { Head, Link } from '@inertiajs/react';
import Shell from '@/components/Shell';

const copy: Record<number, [string, string]> = {
    403: ['Off limits', "You don't have access to this page."],
    404: ['Lost sock', "We couldn't find that page."],
    500: [
        'Spin cycle stuck',
        'Something went wrong on our side. Please try again.',
    ],
    503: ['Back soon', "We're doing a quick clean-up. Try again shortly."],
};

export default function ErrorPage({ status }: { status: number }) {
    const [title, text] = copy[status] ?? copy[500];
    return (
        <Shell>
            <Head title={String(status)} />
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <div className="w-full rounded-3xl bg-pw-cream p-10 text-pw-ink shadow-2xl">
                    <p className="text-xs tracking-[0.3em] text-pw-ink/70 uppercase">
                        Error {status}
                    </p>
                    <p className="mt-2 font-serif text-5xl">{title}</p>
                    <p className="mt-3 text-pw-ink/70">{text}</p>
                    <Link
                        href="/"
                        className="mt-8 inline-block rounded-full bg-pw-ink px-8 py-3 font-semibold text-pw-cream transition hover:bg-pw-peach hover:text-pw-ink"
                    >
                        Back home
                    </Link>
                </div>
            </div>
        </Shell>
    );
}
