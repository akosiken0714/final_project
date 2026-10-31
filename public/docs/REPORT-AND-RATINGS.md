# Business report and customer ratings

## Turn it on (one time)

1. Create the ratings table: `php artisan migrate`
   (phpMyAdmin instead? Run `database/sql/order_ratings.sql` in the SQL tab.)
2. Rebuild the front end: `npm run dev` (or `npm run build`).
3. Optional, for a demo: `php artisan laundry:demo-ratings` adds sample ratings to finished orders.
   Remove only the samples any time with `php artisan laundry:demo-ratings --clear`.
   (Real customer ratings are never touched. The command is switched off on a live site unless you add `--force`.)

Until step 1 is done, the site keeps working: the report shows "Ratings have not been switched on yet"
and the Rate button explains that ratings are not on yet.

## Where things are

| What | Where |
| --- | --- |
| Print the report | Admin dashboard, "Print report" button (next to "Download CSV"), or `/admin/report` |
| Pick a period | Last 7 / 30 / 90 days, This month, Last month, Last 12 months |
| Save as PDF | Print window, choose "Save as PDF" |
| Customer rates an order | My Orders, Finished tab, "Rate" on any claimed order |
| All the numbers and advice | `app/Support/BusinessReport.php` |
| Targets used by the advice | `config/laundry.php` under `report` (or `REPORT_*` values in `.env`) |

## What the report contains (in reading order)

1. **The short version**: one plain sentence, plus Sales, Orders, Average order, Customer rating, each compared with the period before.
2. **What to do next**: "Needs attention" (marked *Do this first* or *Keep an eye on*) and "Going well".
3. **Sales over time**: bar chart by day (or week for long periods).
4. **Money**: laundry sales, delivery fees, money actually received (cash / GCash), money still unpaid.
5. **Orders and speed**: where orders are now, average time to ready, longest waiting order, stuck orders, delivery vs drop-off, cash vs GCash.
6. **What customers ordered**: services ranked, with share of orders.
7. **Your customers**: new vs returning, top customers.
8. **Busy times**: busiest day and hour, orders per weekday.
9. **Customer feedback**: average stars, how many gave 1-5, comments to improve and comments customers liked.

The headline numbers use the same rules as the dashboard, so the two always agree.

## How the benchmarks shaped it

- **Square Sales Summary**: one report with clearly named money lines (gross, net, total collected) and a Print / Export button right on the report. So: money is split into labelled lines, and print is one click.
- **CleanCloud**: reports on revenue, orders and top services in one place, filtered by period, with export. So: one period picker, services ranked, CSV export stays on the dashboard.
- **Customer satisfaction (CSAT) practice**: a 1-5 star rating plus one optional open comment, asked right after the service, and asking "what could we improve?" only when the rating is low. That is exactly the rating form.
- **Plain-language reports**: summary first, actions second, detail after; every colour is backed by words or numbers so it also prints well in black and white.

The yardsticks in `config/laundry.php` (24h quick, 48h slow, 4.0 stars good, and so on) are sensible starting points,
not industry laws. Change them to match your own goals.
