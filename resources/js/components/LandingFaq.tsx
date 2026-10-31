import Reveal from '@/components/Reveal';

// Plain questions with plain answers. These use the browser's own <details> element, so they open with
// Enter/Space, work with a screen reader, and need no JavaScript.
// To change an answer, edit the text below. (Update the payment answer when real GCash goes live.)
const FAQ: [string, string][] = [
    [
        'Paano mag-order?',
        'Gumawa ng account, piliin ang service, ilagay ang timbang, at piliin kung ihahatid mo sa shop o kukunin namin sa bahay. Kita mo agad ang total bago ka mag-submit.',
    ],
    [
        'Hanggang saan ang delivery?',
        'Hanggang mga 5 km mula sa shop. Ang delivery fee ay ₱20, ₱40 o ₱60 depende sa layo. Mag-pin ka lang sa mapa at makikita mo agad kung kaya naming pumunta at magkano.',
    ],
    [
        'Pwede bang dalhin ko na lang sa shop?',
        'Oo naman! Drop-off at pickup sa shop ay walang delivery fee.',
    ],
    [
        'Paano ako magbabayad?',
        'Cash ang available ngayon, pagkuha mo o pagdating ng rider. Online payment (GCash) ay darating pa.',
    ],
    [
        'Paano ko malalaman kung tapos na ang labada ko?',
        'Makikita mo ang bawat hakbang sa My Orders: Received, Washing, Ready o On the way, at Done. May notification din sa bell kapag nagbago ang status.',
    ],
    [
        'Pwede ba akong mag-upload ng photo?',
        "Pwede, optional. Pribado ang photo: ikaw at ang shop lang ang makakakita, at pwede mo itong tanggalin hangga't hindi pa nasisimulan ang order.",
    ],
];

export default function LandingFaq() {
    return (
        <section
            id="faq"
            className="relative scroll-mt-24 px-6 py-20"
            aria-labelledby="faq-title"
        >
            <div className="relative z-10 mx-auto max-w-3xl">
                <Reveal>
                    <p className="text-xs tracking-[0.3em] text-pw-sky uppercase">
                        FAQ
                    </p>
                    <h2
                        id="faq-title"
                        className="mt-3 font-serif text-5xl text-pw-cream md:text-6xl"
                    >
                        Madalas na{' '}
                        <span className="text-pw-peach italic">tanong</span>
                    </h2>
                    <div className="mt-8 border-t border-pw-cream/15">
                        {FAQ.map(([q, a]) => (
                            <details
                                key={q}
                                className="group border-b border-pw-cream/15"
                            >
                                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-serif text-xl text-pw-cream transition-colors duration-200 hover:text-pw-peach md:text-2xl [&::-webkit-details-marker]:hidden">
                                    {q}
                                    <span
                                        aria-hidden="true"
                                        className="text-3xl leading-none text-pw-peach transition-transform duration-200 group-open:rotate-45"
                                    >
                                        +
                                    </span>
                                </summary>
                                <p className="pr-10 pb-5 text-base leading-relaxed text-pw-cream/75">
                                    {a}
                                </p>
                            </details>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
