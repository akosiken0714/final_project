<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LaundryTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    private function service(bool $active = true): Service
    {
        return Service::create(['name' => 'Wash ' . uniqid(), 'unit' => 'kg', 'price' => 45, 'active' => $active]);
    }

    private function payload(array $over = []): array
    {
        return array_merge([
            'service_id' => $this->service()->id,
            'quantity' => 3,
            'address' => '12 Sample Street, Barangay One, City',
        ], $over);
    }

    public function test_guests_cannot_open_admin()
    {
        $this->get('/admin')->assertRedirect('/login');
    }

    public function test_customers_cannot_open_admin()
    {
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
    }

    public function test_admin_without_2fa_is_sent_to_security_settings()
{
    // The 2FA rule only applies in production, so pretend we're in production here.
    $this->app->detectEnvironment(fn () => 'production');

    $this->actingAs(User::factory()->create(['role' => 'admin']))
        ->get('/admin')
        ->assertRedirect('/settings/security');
}

    public function test_admin_with_2fa_can_open_admin()
    {
        $this->actingAs($this->admin())->get('/admin')->assertOk();
    }

    public function test_customer_cannot_change_order_status()
    {
        $order = Order::create(['user_id' => User::factory()->create()->id, 'service_id' => $this->service()->id, 'quantity' => 1, 'total' => 45]);
        $this->actingAs(User::factory()->create())->patch("/admin/orders/{$order->id}", ['status' => 'Completed'])->assertForbidden();
    }

    public function test_hidden_services_cannot_be_ordered()
    {
        $hidden = $this->service(false);
        $this->actingAs(User::factory()->create())->post('/orders', $this->payload(['service_id' => $hidden->id]))
            ->assertSessionHasErrors('service_id');
    }

    public function test_quantity_must_be_a_whole_number()
    {
        $this->actingAs(User::factory()->create())->post('/orders', $this->payload(['quantity' => 1.5]))
            ->assertSessionHasErrors('quantity');
    }

    public function test_address_is_required()
    {
        $this->actingAs(User::factory()->create())->post('/orders', $this->payload(['address' => '']))
            ->assertSessionHasErrors('address');
    }

    public function test_valid_order_is_created()
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/orders', $this->payload())->assertRedirect('/orders');
        $this->assertDatabaseHas('orders', ['user_id' => $user->id, 'total' => 135]);
    }

    public function test_non_images_are_rejected()
    {
        Storage::fake('local');
        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload(['photo' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'), 'photo_confirmed' => 1]))
            ->assertSessionHasErrors('photo');
    }

    public function test_photo_needs_confirmation()
    {
        Storage::fake('local');
        $this->actingAs(User::factory()->create())
            ->post('/orders', $this->payload(['photo' => UploadedFile::fake()->image('a.jpg')]))
            ->assertSessionHasErrors('photo_confirmed');
    }

    public function test_photos_are_private_to_owner_and_admin()
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $this->actingAs($owner)->post('/orders', $this->payload(['photo' => UploadedFile::fake()->image('a.jpg', 800, 600), 'photo_confirmed' => 1]));
        $order = Order::firstOrFail();
        Storage::disk('local')->assertExists($order->photo);

        $this->actingAs($owner)->get("/orders/{$order->id}/photo")->assertOk();
        $this->actingAs($this->admin())->get("/orders/{$order->id}/photo")->assertOk();
        $this->actingAs(User::factory()->create())->get("/orders/{$order->id}/photo")->assertNotFound();
    }

    public function test_completed_orders_cannot_be_reopened()
    {
        $order = Order::create(['user_id' => User::factory()->create()->id, 'service_id' => $this->service()->id, 'quantity' => 1, 'total' => 45, 'status' => 'Completed']);
        $this->actingAs($this->admin())->patch("/admin/orders/{$order->id}", ['status' => 'Pending'])->assertSessionHasErrors('status');
        $this->assertSame('Completed', $order->fresh()->status);
    }

    public function test_last_admin_cannot_be_deleted()
    {
        $admin = $this->admin();
        $this->actingAs($admin)->delete('/settings/profile', ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertNotSoftDeleted($admin);
    }
}