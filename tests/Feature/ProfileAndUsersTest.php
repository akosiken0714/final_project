<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileAndUsersTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);
    }

    public function test_user_can_upload_and_remove_a_profile_picture(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('me.png', 600, 400)])
            ->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertNotNull($user->avatar_path);
        Storage::disk('local')->assertExists($user->avatar_path);
        $this->assertStringStartsWith('/avatars/'.$user->id, $user->avatar);

        $old = $user->avatar_path;
        $this->actingAs($user)->delete('/settings/profile/avatar')->assertSessionHasNoErrors();
        $this->assertNull($user->fresh()->avatar_path);
        Storage::disk('local')->assertMissing($old);
    }

    public function test_profile_picture_rejects_non_images(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->create('evil.php', 10, 'application/x-php')])
            ->assertSessionHasErrors('avatar');
    }

    public function test_only_the_owner_or_an_admin_can_see_a_profile_picture(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($owner)->post('/settings/profile/avatar', ['avatar' => UploadedFile::fake()->image('me.jpg')]);

        $this->actingAs($owner)->get('/avatars/'.$owner->id)->assertOk();
        $this->actingAs($this->admin())->get('/avatars/'.$owner->id)->assertOk();
        $this->actingAs($other)->get('/avatars/'.$owner->id)->assertNotFound();
        auth()->logout();
        $this->get('/avatars/'.$owner->id)->assertRedirect('/login');
    }

    public function test_changing_email_needs_the_current_password(): void
    {
        $user = User::factory()->create();
        $base = ['name' => $user->name, 'phone' => '09123456789', 'email' => 'new@example.com'];

        $this->actingAs($user)->patch('/settings/profile', $base)->assertSessionHasErrors('current_password');
        $this->actingAs($user)->patch('/settings/profile', $base + ['current_password' => 'wrong'])->assertSessionHasErrors('current_password');
        $this->actingAs($user)->patch('/settings/profile', $base + ['current_password' => 'password'])->assertSessionHasNoErrors();
        $this->assertSame('new@example.com', $user->fresh()->email);
    }

    public function test_usual_spot_can_be_saved_in_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch('/settings/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'phone' => '09123456789',
            'delivery_notes' => 'Blue gate',
            'default_lat' => 10.2667,
            'default_lng' => 125.0167,
        ])->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertSame('Blue gate', $user->delivery_notes);
        $this->assertEqualsWithDelta(10.2667, $user->default_lat, 0.0001);

        // a lat without a lng is refused
        $this->actingAs($user)->patch('/settings/profile', [
            'name' => $user->name, 'email' => $user->email, 'phone' => '09123456789', 'default_lat' => 10.2,
        ])->assertSessionHasErrors('default_lng');
    }

    public function test_first_delivery_order_remembers_the_spot(): void
    {
        $user = User::factory()->create();
        $service = Service::create(['name' => 'Wash', 'unit' => 'kg', 'price' => 45, 'active' => true]);

        $this->actingAs($user)->post('/orders', [
            'service_id' => $service->id,
            'quantity' => 2,
            'fulfillment' => 'delivery',
            'address' => '12 Sample Street, Barangay One, City',
            'lat' => config('laundry.shop.lat'),
            'lng' => config('laundry.shop.lng'),
            'payment_method' => 'cash',
        ])->assertSessionHasNoErrors();

        $this->assertNotNull($user->fresh()->default_lat);
    }

    public function test_admin_can_create_users_but_customers_cannot(): void
    {
        $form = [
            'name' => 'Walk In',
            'email' => 'walkin@example.com',
            'phone' => '09123456789',
            'role' => 'customer',
            'password' => 'Str0ng-Pass-123!',
            'password_confirmation' => 'Str0ng-Pass-123!',
            'admin_password' => 'password',
        ];

        $this->actingAs(User::factory()->create())->post('/admin/users', $form)->assertForbidden();

        $this->actingAs($this->admin())->post('/admin/users', $form)->assertSessionHasNoErrors();
        $made = User::where('email', 'walkin@example.com')->first();
        $this->assertSame('customer', $made->role);
        $this->assertNotNull($made->email_verified_at);

        // wrong admin password: nothing created
        $this->actingAs($this->admin())
            ->post('/admin/users', ['email' => 'x@example.com', 'admin_password' => 'nope'] + $form)
            ->assertSessionHasErrors('admin_password');
        $this->assertNull(User::where('email', 'x@example.com')->first());
    }

    public function test_security_headers_are_sent(): void
    {
        $this->get('/')->assertHeader('X-Frame-Options', 'SAMEORIGIN')->assertHeader('X-Content-Type-Options', 'nosniff');
    }
}
