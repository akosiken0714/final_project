<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Services\Payments\DemoGcashGateway;
use App\Services\Payments\Payments;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

// The pretend GCash must be impossible on a live site.
class PaymentsProductionTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $over = []): array
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return array_merge([
            'service_id' => $service->id,
            'quantity' => 3,
            'fulfillment' => 'dropoff',
            'payment_method' => 'cash',
        ], $over);
    }

    private function goLive(): void
    {
        $this->app['env'] = 'production';
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class);
        config(['laundry.payments.driver' => 'demo']);
    }

    public function test_demo_payments_work_on_local_and_testing(): void
    {
        $this->assertTrue(Payments::enabled());
        $this->assertInstanceOf(DemoGcashGateway::class, Payments::gateway());
    }

    public function test_demo_payments_are_off_in_production(): void
    {
        $this->goLive();

        $this->assertFalse(Payments::enabled());
        $this->expectException(RuntimeException::class);
        Payments::gateway();
    }

    public function test_an_unknown_driver_is_off(): void
    {
        config(['laundry.payments.driver' => 'something-else']);

        $this->assertFalse(Payments::enabled());
    }

    public function test_gcash_orders_are_refused_in_production_and_nothing_is_saved(): void
    {
        $this->goLive();

        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload(['payment_method' => 'gcash']))
            ->assertSessionHasErrors('payment_method');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_cash_orders_still_work_in_production(): void
    {
        $this->goLive();

        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload())
            ->assertSessionHasNoErrors();

        $this->assertDatabaseCount('orders', 1);
    }

    public function test_the_pay_screen_and_pay_action_are_closed_in_production(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/orders', $this->payload(['payment_method' => 'gcash']))->assertSessionHasNoErrors();
        $order = Order::latest('id')->firstOrFail();

        $this->goLive();
        $this->withoutExceptionHandling();

        $this->expectException(NotFoundHttpException::class);
        $this->actingAs($user)->get("/orders/{$order->id}/pay");
    }

    public function test_paying_is_closed_in_production_even_with_the_right_code(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/orders', $this->payload(['payment_method' => 'gcash']))->assertSessionHasNoErrors();
        $order = Order::latest('id')->firstOrFail();

        $this->goLive();
        $this->withoutExceptionHandling();

        try {
            $this->actingAs($user)->post("/orders/{$order->id}/pay", ['gcash_number' => '09171234567', 'code' => '123456']);
            $this->fail('The pay action should have been closed.');
        } catch (NotFoundHttpException) {
            $this->assertSame('unpaid', $order->fresh()->payment_status);
            $this->assertDatabaseCount('payments', 0);
        }
    }

    public function test_the_demo_gateway_accepts_nothing_when_no_code_is_set(): void
    {
        config(['laundry.payments.demo_code' => null]);
        $order = new Order;

        $result = (new DemoGcashGateway)->charge($order, ['gcash_number' => '09171234567', 'code' => '']);

        $this->assertFalse($result->success);
    }
}
