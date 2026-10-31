<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SelfDeleteRulesTest extends TestCase
{
    use RefreshDatabase;

    private function order(User $owner, string $status): Order
    {
        $service = Service::create(['name' => 'Wash '.uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => true]);

        return Order::create([
            'user_id' => $owner->id,
            'service_id' => $service->id,
            'quantity' => 2,
            'total' => 90,
            'status' => $status,
            'fulfillment' => Order::DROPOFF,
        ]);
    }

    public function test_an_admin_cannot_delete_their_own_account_even_with_other_admins(): void
    {
        User::factory()->create(['role' => 'admin']);
        $admin = User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->from(route('profile.edit'))
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors('password');

        $this->assertNotSoftDeleted('users', ['id' => $admin->id]);
        $this->assertAuthenticatedAs($admin);
    }

    public function test_a_customer_with_an_unfinished_order_cannot_delete_their_account(): void
    {
        $user = User::factory()->create();
        $this->order($user, 'Pending');

        $this->actingAs($user)->from(route('profile.edit'))
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors('password');

        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_a_customer_with_only_finished_orders_can_delete_their_account(): void
    {
        $user = User::factory()->create();
        $this->order($user, Order::CLAIMED);
        $this->order($user, Order::CANCELLED);

        $this->actingAs($user)
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasNoErrors();

        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }
}
