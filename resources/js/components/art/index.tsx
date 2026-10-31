import type { CSSProperties } from 'react';

// PhineWash illustration set: one hand-drawn line style (3px ink outline, rounded ends, flat brand-color fills).
// Colors use the design tokens (with the hex as a fallback), so they follow the theme and never go stale.
// Each drawing is decorative (aria-hidden): put the meaning in the caption or heading next to it.
// Usage:  <WasherArt className="w-full" />   (they scale to the width you give them; 4:3 shape)

const col = {
    ink: 'var(--color-pw-ink, #0f1e2b)',
    cream: 'var(--color-pw-cream, #f7f1e8)',
    peach: 'var(--color-pw-peach, #f0a98b)',
    sky: 'var(--color-pw-sky, #a9d3e6)',
    steel: 'var(--color-pw-steel, #5c8ca8)',
    linen: 'var(--color-pw-linen, #efe7d8)',
    clay: 'var(--color-pw-clay, #c96f48)',
};
type Tone = keyof typeof col;

const fill = (t: Tone): CSSProperties => ({ fill: col[t] });
const line: CSSProperties = {
    stroke: col.ink,
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
};

type Props = { className?: string };

function Art({ className, children }: Props & { children: React.ReactNode }) {
    return (
        <svg
            viewBox="0 0 240 180"
            className={className}
            aria-hidden="true"
            focusable="false"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g style={line}>{children}</g>
        </svg>
    );
}

// 1. A front-loading washing machine with a window full of suds.
export function WasherArt({ className }: Props) {
    return (
        <Art className={className}>
            <ellipse cx="120" cy="164" rx="62" ry="6" style={{ ...fill('linen'), stroke: 'none' }} />
            <rect x="62" y="22" width="116" height="138" rx="14" style={fill('cream')} />
            <path d="M62 54h116" />
            <circle cx="82" cy="38" r="5" style={fill('peach')} />
            <circle cx="98" cy="38" r="5" style={fill('sky')} />
            <rect x="124" y="33" width="38" height="10" rx="5" style={fill('linen')} />
            <circle cx="120" cy="108" r="36" style={fill('linen')} />
            <circle cx="120" cy="108" r="27" style={fill('sky')} />
            <path d="M96 112c6-7 12 7 18 0s12 7 18 0 8 3 10 1" />
            <circle cx="108" cy="98" r="4" style={fill('cream')} />
            <circle cx="128" cy="94" r="3" style={fill('cream')} />
            <circle cx="134" cy="104" r="2.2" style={fill('cream')} />
            <path d="M74 160v6M166 160v6" />
            <path d="M196 40l4-9 4 9 9 4-9 4-4 9-4-9-9-4z" style={fill('peach')} />
        </Art>
    );
}

// 2. A neatly folded stack with a claim tag hanging off it.
export function FoldedStackArt({ className }: Props) {
    return (
        <Art className={className}>
            <ellipse cx="116" cy="156" rx="74" ry="7" style={{ ...fill('linen'), stroke: 'none' }} />
            <rect x="42" y="112" width="148" height="38" rx="9" style={fill('sky')} />
            <path d="M42 131h148" />
            <rect x="52" y="74" width="132" height="38" rx="9" style={fill('peach')} />
            <path d="M52 93h132M96 74v38" />
            <rect x="62" y="38" width="112" height="36" rx="9" style={fill('cream')} />
            <path d="M62 56h112" />
            <path d="M174 64c20 6 26 22 22 40" />
            <path d="M190 100l16 6-3 30-22-4z" style={fill('cream')} />
            <circle cx="194" cy="110" r="2.6" style={fill('ink')} />
            <path d="M190 122h10M189 128h8" />
        </Art>
    );
}

// 3. A laundry basket with a shirt sleeve spilling over the rim.
export function BasketArt({ className }: Props) {
    return (
        <Art className={className}>
            <ellipse cx="120" cy="162" rx="66" ry="6" style={{ ...fill('linen'), stroke: 'none' }} />
            <path d="M70 64c-4-24 8-34 32-30l20 30z" style={fill('peach')} />
            <path d="M96 46c24-14 50-8 64 18H102z" style={fill('sky')} />
            <path d="M138 52c10 2 20 8 26 16" />
            <path d="M44 68h152l-14 86c-1 6-5 8-10 8H68c-5 0-9-2-10-8z" style={fill('cream')} />
            <path d="M44 68h152" />
            <path d="M52 100h136M58 130h124" />
            <path d="M84 68l4 92M120 68v94M156 68l-4 92" />
            <rect x="40" y="62" width="160" height="12" rx="6" style={fill('linen')} />
        </Art>
    );
}

// 4. A delivery rider on a scooter, with the laundry box on the back.
export function RiderArt({ className }: Props) {
    return (
        <Art className={className}>
            <path d="M10 160h220" style={{ stroke: col.linen }} />
            <path d="M12 118h26M4 130h30M14 142h20" style={{ stroke: col.sky }} />
            {/* delivery box on a rack */}
            <path d="M44 112h46" />
            <rect x="34" y="68" width="62" height="44" rx="9" style={fill('steel')} />
            <path d="M34 84h62" />
            <rect x="58" y="76" width="14" height="5" rx="2.5" style={fill('cream')} />
            {/* scooter body, seat and front column */}
            <path d="M88 128c0-10 6-14 16-14h40c6 0 9 4 8 10l-3 16H96c-5 0-8-4-8-12z" style={fill('peach')} />
            <rect x="94" y="102" width="46" height="12" rx="6" style={fill('cream')} />
            <path d="M156 126l10-48M156 78h22" />
            <path d="M166 82l16 58" />
            {/* wheels */}
            <circle cx="70" cy="140" r="19" style={fill('cream')} />
            <circle cx="70" cy="140" r="6" style={fill('linen')} />
            <circle cx="184" cy="140" r="19" style={fill('cream')} />
            <circle cx="184" cy="140" r="6" style={fill('linen')} />
            <path d="M158 136h-24" />
            {/* rider */}
            <path d="M108 100c-4-14 0-26 12-30 10-3 16 4 16 14l-4 18z" style={fill('sky')} />
            <path d="M130 82l30-4" />
            <path d="M112 100l22 6-2 22" />
            <circle cx="124" cy="52" r="12" style={fill('cream')} />
            <path d="M126 50h10" />
        </Art>
    );
}

// 5. A claim tag: the number that finds your laundry again.
export function ClaimTagArt({ className }: Props) {
    return (
        <Art className={className}>
            <ellipse cx="120" cy="166" rx="56" ry="5" style={{ ...fill('linen'), stroke: 'none' }} />
            <path d="M120 14c-24 4-28 18-14 24" />
            <path d="M82 36h76l16 20v92c0 6-4 10-10 10H76c-6 0-10-4-10-10V56z" style={fill('cream')} />
            <circle cx="120" cy="52" r="8" style={fill('linen')} />
            <rect x="82" y="74" width="76" height="24" rx="6" style={fill('peach')} />
            <path d="M92 86h20M122 86h10" />
            <path d="M82 114h76M82 128h54M82 142h66" />
            <path d="M186 28l3-7 3 7 7 3-7 3-3 7-3-7-7-3z" style={fill('sky')} />
        </Art>
    );
}

export const ART = {
    washer: WasherArt,
    stack: FoldedStackArt,
    basket: BasketArt,
    rider: RiderArt,
    tag: ClaimTagArt,
};
