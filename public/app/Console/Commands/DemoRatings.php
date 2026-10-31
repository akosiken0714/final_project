<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderRating;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

// Fills the Customer feedback part of the admin report with sample ratings, for demos.
// Sample ratings are marked "demo", so `--clear` removes only them and never a real customer's rating.
class DemoRatings extends Command
{
    protected $signature = 'laundry:demo-ratings {--clear : Remove the sample ratings instead of adding them} {--force : Allow on a live site}';

    protected $description = 'Add (or remove) sample customer ratings so the report can be demonstrated';

    private const PRAISE = [
        'Fast and clean, my clothes smelled great!',
        'The delivery was right on time. Very convenient.',
        'Neatly folded and nothing was missing. Thank you!',
        'Friendly staff and fair prices.',
        'Ready earlier than promised. Will order again.',
    ];

    private const COMPLAINTS = [
        'It took longer than they said it would.',
        'One shirt still had a stain after washing.',
        'Nobody told me when my order was ready.',
        'Delivery came late in the evening.',
    ];

    public function handle(): int
    {
        if (! app()->environment(['local', 'testing']) && ! $this->option('force')) {
            $this->error('This is for demos only, so it is switched off on a live site. Use --force if you really mean it.');

            return self::FAILURE;
        }

        if (! Schema::hasTable('order_ratings')) {
            $this->error('The ratings table is missing. Run: php artisan migrate');

            return self::FAILURE;
        }

        if ($this->option('clear')) {
            $this->info('Removed '.OrderRating::where('demo', true)->delete().' sample ratings.');

            return self::SUCCESS;
        }

        $made = 0;
        Order::where('status', Order::CLAIMED)->doesntHave('rating')->latest('id')->limit(200)->get()
            ->each(function (Order $order) use (&$made) {
                // Skip some orders: not every customer leaves a rating, just like in real life.
                if (random_int(1, 100) > 70) {
                    return;
                }

                // Mostly happy customers, a few unhappy ones.
                $roll = random_int(1, 100);
                $stars = $roll <= 50 ? 5 : ($roll <= 78 ? 4 : ($roll <= 90 ? 3 : ($roll <= 96 ? 2 : 1)));
                $pool = $stars >= 4 ? self::PRAISE : self::COMPLAINTS;
                $comment = random_int(1, 100) <= 60 ? $pool[array_rand($pool)] : null;

                OrderRating::create([
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'stars' => $stars,
                    'comment' => $comment,
                    'demo' => true,
                    'created_at' => $order->updated_at,
                    'updated_at' => $order->updated_at,
                ]);
                $made++;
            });

        $this->info("Added {$made} sample ratings to finished orders. Remove them any time with: php artisan laundry:demo-ratings --clear");

        return self::SUCCESS;
    }
}
