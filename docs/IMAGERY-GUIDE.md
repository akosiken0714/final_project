# Imagery guide: where to put each piece

You get 5 illustrations (`components/art`) and one frame (`components/ImageFrame.tsx`). `illustration-preview.png` shows them.
Rules: ONE image per section, below the hero (the hero stays as it is), never more than two per screen. Real photos replace illustrations over time.

## The two lines you add to a page
```tsx
import ImageFrame from '@/components/ImageFrame';
import { WasherArt, FoldedStackArt, BasketArt, RiderArt, ClaimTagArt } from '@/components/art';
```

## Where each one goes
| Where | Piece | Code to paste |
|---|---|---|
| "How it works" step: place the order | tag | `<ImageFrame tilt="left" caption="Get your tag"><ClaimTagArt className="w-full" /></ImageFrame>` |
| step: we pick up / you drop off | rider | `<ImageFrame tilt="right" caption="We pick it up"><RiderArt className="w-full" /></ImageFrame>` |
| step: we wash and dry | washer | `<ImageFrame tilt="left" caption="Washed with care"><WasherArt className="w-full" /></ImageFrame>` |
| step: ready for pickup or delivery | stack | `<ImageFrame tilt="right" caption="Folded and tagged"><FoldedStackArt className="w-full" /></ImageFrame>` |
| Delivery / "where we deliver" section | rider | same as above |
| Empty "My orders" list, empty admin tables | basket | `<BasketArt className="mx-auto w-40" />` above the "No orders yet" text (no frame) |

## How to place one in a section
Put the frame in its own grid cell next to the text, never on top of it:
```tsx
<div className="grid items-center gap-8 md:grid-cols-2">
  <div> {/* your existing heading + paragraph */} </div>
  <ImageFrame tilt="right" caption="Washed with care"><WasherArt className="w-full" /></ImageFrame>
</div>
```
On phones the frame stacks under the text and the tilt is switched off (tilt is desktop-only, so nothing feels crooked while scrolling).
To flip sides on every other section, add `md:order-first` to the frame.

## Swapping in a real photo later (same spot, same frame)
```tsx
<ImageFrame src="/images/counter.webp" alt="The PhineWash counter in Poblacion" width={1200} height={900} caption="Our counter" />
```
Photo checklist (phone camera, daylight, wipe the lens): 1) shop front 2) counter with the tag stack 3) machines running
4) folded and bagged laundry with a tag 5) you or staff working 6) the rider with a bag. Landscape 4:3.
Resize to about 1200px wide and save as WebP under 200 KB (squoosh.app does this in the browser) into `public/images/`.
`width` and `height` are required so the page does not jump while loading. Alt text says what is in the photo, in one short sentence.

## Design rules this follows
Same 3px ink line and the five brand colors in every drawing; one frame style (paper card, tape strip, serif caption);
one image per section; decorative art is hidden from screen readers, so the caption or heading carries the meaning.
