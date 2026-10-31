<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderRating;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ReportAndRatingTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    private function order(User $customer, string $status = 'Completed', float $total = 135): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return Order::create([
            'user_id' => $customer->id,
            'service_id' => $service->id,
            'quantity' => 3,
            'total' => $total,
            'status' => $status,
            'fulfillment' => Order::DROPOFF,
        ]);
    }

    // ---------- The admin report ----------

    public function test_only_admins_can_open_the_report()
    {
        $this->get('/admin/report')->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get('/admin/report')->assertForbidden();
    }

    public function test_report_opens_with_no_orders_at_all()
    {
        $this->actingAs($this->admin())->get('/admin/report')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Report')
                ->where('period', '30')
                ->where('summary.orders', 0)
                ->has('advice.improve')
                ->has('trend.points'));
    }

    public function test_unknown_period_falls_back_to_30_days()
    {
        $this->actingAs($this->admin())->get('/admin/report?period=banana')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('period', '30'));
    }

    public function test_every_period_choice_works()
    {
        $admin = $this->admin();

        foreach (array_keys(\App\Support\BusinessReport::PERIODS) as $period) {
            $this->actingAs($admin)->get('/admin/report?period='.$period)->assertOk();
        }
    }

    public function test_report_sales_only_count_finished_orders()
    {
        $customer = User::factory()->create();
        $this->order($customer, 'Completed', 135);
        $this->order($customer, 'Pending', 90);

        $this->actingAs($this->admin())->get('/admin/report')
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.orders', 2)
                ->where('summary.completed', 1)
                ->where('summary.sales', fn ($v) => (float) $v === 135.0)
                ->where('money.sales', fn ($v) => (float) $v === 135.0));
    }

    // ---------- Customer ratings ----------

    public function test_customer_can_rate_a_finished_order()
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);

        $this->actingAs($customer)
            ->post("/orders/{$order->id}/rating", ['stars' => 4, 'comment' => 'Fast and neat'])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('order_ratings', ['order_id' => $order->id, 'stars' => 4, 'comment' => 'Fast and neat', 'demo' => false]);
    }

    public function test_rating_again_updates_the_same_rating()
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);

        $this->actingAs($customer)->post("/orders/{$order->id}/rating", ['stars' => 2]);
        $this->actingAs($customer)->post("/orders/{$order->id}/rating", ['stars' => 5, 'comment' => 'Much better']);

        $this->assertSame(1, OrderRating::where('order_id', $order->id)->count());
        $this->assertSame(5, OrderRating::where('order_id', $order->id)->value('stars'));
    }

    public function test_only_finished_orders_can_be_rated()
    {
        $customer = User::factory()->create();
        $order = $this->order($customer, 'In Progress');

        $this->actingAs($customer)->post("/orders/{$order->id}/rating", ['stars' => 5])
            ->assertSessionHasErrors('rating');

        $this->assertDatabaseCount('order_ratings', 0);
    }

    public function test_customers_cannot_rate_someone_elses_order()
    {
        $order = $this->order(User::factory()->create());

        $this->actingAs(User::factory()->create())
            ->post("/orders/{$order->id}/rating", ['stars' => 5])
            ->assertNotFound();
    }

    public function test_stars_must_be_between_1_and_5()
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);

        foreach ([0, 6, 'many', null] as $bad) {
            $this->actingAs($customer)->post("/orders/{$order->id}/rating", ['stars' => $bad])
                ->assertSessionHasErrors('stars');
        }
    }

    public function test_ratings_show_up_in_the_report()
    {
        $customer = User::factory()->create();
        $a = $this->order($customer);
        $b = $this->order($customer);

        $this->actingAs($customer)->post("/orders/{$a->id}/rating", ['stars' => 5, 'comment' => 'Great']);
        $this->actingAs($customer)->post("/orders/{$b->id}/rating", ['stars' => 2, 'comment' => 'Too slow']);

        $this->actingAs($this->admin())->get('/admin/report')
            ->assertInertia(fn (Assert $page) => $page
                ->where('ratings.count', 2)
                ->where('ratings.average', fn ($v) => (float) $v === 3.5)
                ->has('ratings.needsAttention', 1)
                ->has('ratings.praise', 1));
    }

    public function test_customer_orders_page_still_loads_with_ratings()
    {
        $customer = User::factory()->create();
        $order = $this->order($customer);
        $this->actingAs($customer)->post("/orders/{$order->id}/rating", ['stars' => 5]);

        $this->actingAs($customer)->get('/orders?view=finished')->assertOk();
    }

    // ---------- Demo ratings ----------

    public function test_clearing_demo_ratings_never_touches_real_ones()
    {
        $customer = User::factory()->create();
        $real = $this->order($customer);
        $demo = $this->order($customer);

        OrderRating::create(['order_id' => $real->id, 'user_id' => $customer->id, 'stars' => 5, 'demo' => false]);
        OrderRating::create(['order_id' => $demo->id, 'user_id' => $customer->id, 'stars' => 1, 'demo' => true]);

        $this->artisan('laundry:demo-ratings', ['--clear' => true])->assertExitCode(0);

        $this->assertDatabaseHas('order_ratings', ['order_id' => $real->id]);
        $this->assertDatabaseMissing('order_ratings', ['order_id' => $demo->id]);
    }
}
