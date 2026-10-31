<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PickupSlotTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $over = []): array
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        // drop-off needs no address or map pin, which keeps these tests short
        return array_merge(['service_id' => $service->id, 'quantity' => 2, 'fulfillment' => Order::DROPOFF], $over);
    }

    public function test_order_without_a_slot_still_works(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/orders', $this->payload())->assertSessionHasNoErrors();

        $order = Order::where('user_id', $user->id)->first();
        $this->assertNull($order->pickup_date);
        $this->assertNull($order->pickup_slot);
    }

    public function test_order_saves_the_chosen_day_and_slot(): void
    {
        $user = User::factory()->create();
        $day = now()->addDays(2)->format('Y-m-d');

        $this->actingAs($user)->post('/orders', $this->payload(['pickup_date' => $day, 'pickup_slot' => 'afternoon']))
            ->assertSessionHasNoErrors();

        $order = Order::where('user_id', $user->id)->first();
        $this->assertSame($day, $order->pickup_date->format('Y-m-d'));
        $this->assertSame('afternoon', $order->pickup_slot);
    }

    public function test_past_days_far_future_days_and_bad_slots_are_refused(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/orders', $this->payload(['pickup_date' => now()->subDays(2)->format('Y-m-d')]))
            ->assertSessionHasErrors('pickup_date');

        $this->actingAs($user)->post('/orders', $this->payload(['pickup_date' => now()->addDays(30)->format('Y-m-d')]))
            ->assertSessionHasErrors('pickup_date');

        $this->actingAs($user)->post('/orders', $this->payload(['pickup_slot' => 'midnight']))
            ->assertSessionHasErrors('pickup_slot');

        $this->assertSame(0, Order::count());
    }
}
