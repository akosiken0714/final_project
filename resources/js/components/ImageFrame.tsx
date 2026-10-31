import type { ReactNode } from 'react';

// A paper "photo" frame: a slight tilt, a tape strip and an optional caption.
// Use it for ONE image per section. It holds either a real photo (src + alt + size) or an illustration (children).
//
//   <ImageFrame src="/images/shop-front.webp" alt="The PhineWash counter in Poblacion" width={1200} height={900} caption="Our counter in Poblacion" />
//   <ImageFrame tilt="right" caption="Wash, dry, fold"><WasherArt className="w-full" /></ImageFrame>
//
// Photos: save as WebP about 1200px wide and under 200 KB, put them in public/images/.
// `width` and `height` are required for photos so the page does not jump while they load.
type Common = {
    caption?: string;
    tilt?: 'left' | 'right' | 'none';
    className?: string;
};
type Photo = Common & { src: string; alt: string; width: number; height: number; priority?: boolean; children?: never };
type Art = Common & { children: ReactNode; src?: never; alt?: never; width?: never; height?: never; priority?: never };

const TILT = {
    left: 'md:-rotate-2',
    right: 'md:rotate-2',
    none: '',
};

export default function ImageFrame(props: Photo | Art) {
    const { caption, tilt = 'none', className = '' } = props;

    return (
        <figure
            className={`relative mx-auto w-full max-w-md transition-transform duration-200 ease-out md:hover:rotate-0 ${TILT[tilt]} ${className}`}
        >
            {/* tape */}
            <span
                aria-hidden="true"
                className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 rotate-[-3deg] rounded-sm bg-pw-peach/70"
            />
            <div className="paper overflow-hidden p-3 md:p-4">
                <div className="overflow-hidden rounded-2xl bg-pw-linen">
                    {'src' in props && props.src ? (
                        <img
                            src={props.src}
                            alt={props.alt}
                            width={props.width}
                            height={props.height}
                            loading={props.priority ? 'eager' : 'lazy'}
                            decoding="async"
                            className="h-auto w-full object-cover [filter:saturate(0.92)_sepia(0.1)]"
                        />
                    ) : (
                        <div className="p-4 md:p-6">{props.children}</div>
                    )}
                </div>
                {caption && (
                    <figcaption className="mt-3 px-1 text-center font-serif text-lg text-pw-ink italic">
                        {caption}
                    </figcaption>
                )}
            </div>
        </figure>
    );
}
