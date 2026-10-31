# PhineWash design system

One page of rules so every screen looks like the same shop. If a screen breaks a rule, fix the screen, not the rule.
Colors, buttons and phone fixes live in `resources/css/polish.css` (plus the `.btn` base in `app.css`).

## 1. Colors (use the name, never paste a hex code)
| Token | Hex | Use it for | Contrast |
|---|---|---|---|
| `pw-navy` | #0B1F26 | page background, dark bars | cream on it 15.1:1 |
| `pw-ink` | #0F1E2B | text and dark buttons on cream paper | 15.1:1 on cream |
| `pw-cream` | #F7F1E8 | paper cards, text on navy | |
| `pw-peach` | #F0A98B | the one call-to-action, focus ring, highlights | 8.7:1 on navy |
| `pw-sky` | #A9D3E6 | small labels on navy | 10.6:1 on navy |
| `pw-rust` / `pw-rust-deep` | #A5532F / #8A3F1F | links and accents on cream | 4.8 / 6.7:1 |
| `pw-clay`, `pw-steel`, `pw-deep`, `pw-linen` | | borders, tints, wells (not for small text: clay is 3.2:1) | |
| `pw-ok` / `pw-ok-deep` | #2F7D52 / #1F5A40 | success. Use `pw-ok-deep` for small text on cream (`pw-ok` is 4.5:1, borderline) | |
| `pw-warn` | #C9822A | warnings as a badge background or with an icon. **Never small text on cream (2.8:1)** | |
| `pw-danger` | #B33A1A | errors and destructive actions | 5.3:1 on cream |

Rules: status is never shown by color alone (add a word or icon). Text on cream is at least `/70` opacity (5.96:1); `/60` is 4.3:1 and fails.
Write `bg-pw-ink/5`, `text-pw-cream/70`. Do not write `bg-[#0F1E2B]`.

## 2. Spacing and layout
- 4px scale only: `1`=4, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48, `16`=64 px. No `p-[13px]`.
- Page width: one container (`max-w-6xl`), side padding 16px on phones, 24px from `md`, 40px from `lg`.
- Grids: 1 column on phones, 2 from `md`, 3 to 4 from `lg`. Gaps are 16px (tight), 24px (cards), 32 to 48px (sections).
- Radius: pills (`rounded-full`) for buttons and chips, 24 to 28px (`.paper`) for cards, 12px for fields.

## 3. Type scale
- Headings use `font-serif` (italic accent word in `pw-peach`); everything else `font-sans` (Instrument Sans).
- Sizes: 12 (`text-xs`, labels only), 14 (`text-sm`, secondary), 16 (`text-base`, body), 20, 24 (card titles), 36 to 48 (page titles), 60+ (hero only).
- Line length 60 to 75 characters (`max-w-prose` or `max-w-2xl`). Uppercase small labels: 12px, tracking `0.18em`, at least 70% opacity.
- Form fields are 16px on phones (iPhones zoom into anything smaller). `polish.css` enforces this.

## 4. Buttons: always `btn` + one variant
| Class | Where | Looks |
|---|---|---|
| `btn btn-peach` | main action on dark | peach fill |
| `btn btn-navy` | main action on cream paper | ink fill, peach on hover |
| `btn btn-cream` | main action on dark, secondary | cream fill |
| `btn btn-ghost` | secondary on dark | outline |
| `btn btn-outline` | secondary on cream | outline |
| `btn btn-danger` | cancel / remove (confirm first) | red fill |
| `btn btn-quiet` | tertiary, inline text action | underlined text |
Add `btn-sm` in dense tables. Every `.btn` is 44px tall on touch screens, has a 150ms hover lift and a press-down, and a visible disabled state.
One primary button per screen area. Never style a new button from scratch with a long class string.

## 5. Motion
- Hover and press 150ms, panels and page 220ms, big reveals 400ms; one easing (`--pw-ease`).
- Animate `transform` and `opacity` only. No `blur` or big shadows animating on phones.
- Everything respects `prefers-reduced-motion` (already global).
- Phones: no large blurred blobs, no `backdrop-blur`, no full-page masks (see Update 11b).

## 6. Touch, phones and accessibility
- Tap targets at least 44x44px (`polish.css` sets fields and `.btn-sm`; use `.btn` for the rest).
- No sideways page scroll from 360px up. Wide tables scroll inside their own box (`overflow-x-auto`).
- Visible keyboard focus (peach ring) on every link and button; every image has `alt`; every field has a visible `<label>`.
- Hover effects must not be required to understand anything (phones have no hover).

## 7. Definition of done for any UI change
1. Uses tokens and `.btn` variants only. 2. Looks right at 360, 768 and 1280px. 3. TypeScript clean.
4. `npx playwright test` passes on the five browser profiles (or the batch is marked "not run"). 5. Handoff lists any rule still broken.
