<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderRating;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeReviewsTest extends TestCase
{
    use RefreshDatabase;

    private function rate(int $stars, ?string $comment, string $name = 'Maria Dela Cruz'): void
    {
        $user = User::factory()->create(['name' => $name]);
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);
        $order = Order::create(['user_id' => $user->id, 'service_id' => $service->id, 'quantity' => 1, 'total' => 45, 'fulfillment' => Order::DROPOFF]);

        OrderRating::create(['order_id' => $order->id, 'user_id' => $user->id, 'stars' => $stars, 'comment' => $comment]);
    }

    public function test_no_ratings_means_no_reviews(): void
    {
        $this->get('/')->assertInertia(fn (Assert $page) => $page->has('reviews', 0)->where('reviewSummary.count', 0));
    }

    public function test_only_good_written_reviews_are_listed_but_all_ratings_count(): void
    {
        $this->rate(5, 'Super linis!');
        $this->rate(4, 'Mabilis ang serbisyo');
        $this->rate(5, null);          // no comment: counted, not listed
        $this->rate(2, 'Medyo mabagal'); // low stars: counted, not listed

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('reviews', 2)
            ->where('reviewSummary.count', 4)
            ->where('reviewSummary.breakdown', [2, 1, 0, 1, 0]));
    }

    public function test_names_are_shortened(): void
    {
        $this->rate(5, 'Ang ganda', 'Maria Dela Cruz');

        $this->get('/')->assertInertia(fn (Assert $page) => $page->where('reviews.0.name', 'Maria C.'));
    }

    public function test_no_more_than_six_reviews_are_sent(): void
    {
        foreach (range(1, 9) as $i) {
            $this->rate(5, "Review number $i");
        }

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->has('reviews', 6)
            ->where('reviewSummary.count', 9)); // the score still counts everyone
    }

    public function test_long_comments_are_shortened(): void
    {
        $this->rate(5, str_repeat('Sobrang ganda ng serbisyo. ', 20));

        $this->get('/')->assertInertia(fn (Assert $page) => $page
            ->where('reviews.0.comment', fn ($comment) => mb_strlen($comment) <= 143));
    }
}
