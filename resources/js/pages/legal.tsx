import { Head, Link } from '@inertiajs/react';
import Shell from '@/components/Shell';

// Plain-language starter text. It is a TEMPLATE: the shop owner should read it, change anything that is not
// true for the shop, and ideally have it checked (the Philippines has the Data Privacy Act of 2012, RA 10173).
const SHOP = 'PhineWash Laundry Services';
const UPDATED = 'October 2026';

const PAGES: Record<
    string,
    { title: string; intro: string; sections: [string, string][] }
> = {
    privacy: {
        title: 'Privacy Policy',
        intro: `How ${SHOP} handles your personal information.`,
        sections: [
            [
                'What we collect',
                'Your name, email, phone number and password (stored securely, never in plain text). When you order for delivery we also keep your address and map pin, your order details, and any order photo or profile picture you upload.',
            ],
            [
                'Why we collect it',
                'To pick up and deliver your laundry, show your order status, send order updates, take payment, and keep our records and reports. We do not sell your information.',
            ],
            [
                'Who can see it',
                'Only the shop staff who handle your orders. We share information with a service provider only when needed to run the service (for example, an email or payment provider), and when the law requires it.',
            ],
            [
                'How long we keep it',
                'While your account is active and as long as we need it for order and accounting records.',
            ],
            [
                'Your choices',
                'You can view and update your details in Settings. You can ask us to correct or delete your account and personal data by contacting the shop.',
            ],
        ],
    },
    terms: {
        title: 'Terms of Service',
        intro: `The simple rules for using ${SHOP}.`,
        sections: [
            [
                'Orders',
                'An order is placed when you submit the order form. Please give a correct phone number and address so we can reach you. We may contact you to confirm details.',
            ],
            [
                'Prices and delivery',
                'Prices are shown before you order. The delivery fee depends on distance from the shop. We cannot deliver outside our delivery area. The final price may change if the laundry is different from what was ordered; we will tell you first.',
            ],
            [
                'Payment',
                'Pay in cash, or by GCash where it is available. Orders are released when payment is settled.',
            ],
            [
                'Care of your items',
                'We take care with every item. Please remove valuables and check pockets. We are not responsible for items left in pockets, or for damage from existing wear or manufacturer care labels that were not followed.',
            ],
            [
                'Unclaimed laundry',
                'Please collect finished laundry promptly. Items left unclaimed for a long time may be handled as the shop announces.',
            ],
            [
                'Changes',
                'We may update these terms. Using the site after changes means you accept them.',
            ],
        ],
    },
    refund: {
        title: 'Refund & Complaints Policy',
        intro: `What happens if something is not right with your order.`,
        sections: [
            [
                'Before we start',
                'Orders that are still Pending can be cancelled by contacting the shop, with no charge.',
            ],
            [
                'Quality problems',
                'If you are not happy with the cleaning, tell us as soon as you receive your laundry and we will wash it again at no extra cost.',
            ],
            [
                'Lost or damaged items',
                'Report it to the shop right away. We will look into it and agree a fair solution with you, which may include a refund or compensation.',
            ],
            [
                'How refunds are paid',
                'Cash payments are refunded in cash. GCash payments are refunded to the same GCash account where possible.',
            ],
            [
                'Contact',
                'Reach the shop by phone or Facebook (see the footer of the home page).',
            ],
        ],
    },
};

export default function Legal({ page }: { page: string }) {
    const doc = PAGES[page] ?? PAGES.privacy;

    return (
        <Shell>
            <Head title={doc.title} />
            <article className="mx-auto max-w-2xl rounded-3xl bg-pw-cream p-8 text-pw-ink shadow-2xl md:p-12">
                <p className="text-xs tracking-[0.3em] text-pw-ink/70 uppercase">
                    Last updated {UPDATED}
                </p>
                <h1 className="mt-2 font-serif text-4xl md:text-5xl">
                    {doc.title}
                </h1>
                <p className="mt-3 text-pw-ink/70">{doc.intro}</p>

                {doc.sections.map(([heading, body]) => (
                    <section key={heading} className="mt-8">
                        <h2 className="font-serif text-2xl">{heading}</h2>
                        <p className="mt-2 leading-relaxed text-pw-ink/80">
                            {body}
                        </p>
                    </section>
                ))}

                <nav
                    aria-label="Legal pages"
                    className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-pw-ink/15 pt-6 text-sm"
                >
                    <Link href="/privacy" className="underline">
                        Privacy
                    </Link>
                    <Link href="/terms" className="underline">
                        Terms
                    </Link>
                    <Link href="/refund" className="underline">
                        Refunds
                    </Link>
                    <Link href="/" className="ml-auto underline">
                        Back home
                    </Link>
                </nav>
            </article>
        </Shell>
    );
}
