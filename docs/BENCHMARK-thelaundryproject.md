# Benchmark notes: thelaundryproject.ph (welcome page only)

Metro Manila laundry, since 2016. Booking is Messenger only (no accounts, no tracking). Notes below are what is worth borrowing.

## Page order (top to bottom)
Hero > how it works (4 steps) > services > Messenger booking > pricing > about + stats > payments > customer reviews > FAQ > location > contact form > final CTA > footer.

## What they do well (and what PhineWash did with it)
| Their idea | PhineWash status |
| --- | --- |
| Hero: one promise, two buttons (Book / View Prices), a trust line under it ("Same-day express - GCash, Maya & cash - 9 years") | Hero is final, do not touch. |
| 4 benefit tiles right under the hero (Save time, All payments, Eco-friendly, 24/7 booking) | Already have 3 hero tiles. Skip. |
| "No app download, no sign-up required" as the main selling point of booking | Done as the guest-vs-login section (guest card is "Coming soon" until guest checkout is built). |
| Pricing grouped in collapsible categories with "Expand all / Collapse all" | Not needed: only about 4-8 services. |
| Payments section with one card per method | Skip. One line "Pay by cash or GCash." is enough. |
| Customer reviews: 3 cards, big "4.9 out of 5" line, name + place | DONE. PhineWash version uses real ratings from `order_ratings`, see below. |
| FAQ (9 questions) | Already have `LandingFaq`. Possible extra questions: minimum order, is my laundry safe, how long does it take. |
| Location card with "Open Now" badge, map, buttons | Already have map + `ShopStatus`. |
| Final CTA band, then footer with socials, legal links, hours | Already have. |
| Trust numbers (animated counters: customers, orders, years) | Do NOT copy until the real numbers exist. Never show invented numbers. |

## What they do badly (avoid)
No order tracking, no accounts, opening hours differ between sections, reviews are hand-typed, all-in-Messenger so nothing is saved.

## Reviews section on PhineWash
- Files: `resources/js/components/LandingReviews.tsx`, data from `app/Http/Controllers/HomeController.php`.
- Shows up to 6 newest written comments with 4 or 5 stars, as cream "price tag" cards with the peach peg, so it matches the pricing cards. Name is first name + last initial only. The "x out of 5 from N ratings" line counts ALL ratings.
- Hides itself until at least one written 4-5 star comment exists. Skips safely if the ratings table has not been migrated.
- For the presentation: `php artisan laundry:demo-ratings` makes sample ratings; `php artisan laundry:demo-ratings --clear` removes them. Do not leave demo ratings on the live site.
- Do not hand-type fake testimonials. Real ratings only.

## Guest vs login section on PhineWash
- File: `resources/js/components/LandingOrderWays.tsx`, placed after pricing, before reviews. Hidden when the visitor is already logged in.
- Guest card: name + phone, cash only, tracking link, no password. Account card: all orders + live status, bell notification, saved orders, GCash + rating.
- `GUEST_ORDERING = false` at the top of the file: the guest card says "Coming soon" with no button. Set it to `true` and set `GUEST_HREF` once guest checkout exists (HANDOFF section 5, item 12).
