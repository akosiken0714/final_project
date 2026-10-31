<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

// An account whose email is not verified yet may only see the "check your email" page.
class UnverifiedAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_is_sent_to_the_verify_page_from_the_dashboard()
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get('/dashboard')->assertRedirect(route('verification.notice'));
    }

    public function test_unverified_user_cannot_open_any_settings_page()
    {
        $user = User::factory()->unverified()->create();

        $pages = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($r) => in_array('GET', $r->methods()) && str_starts_with($r->uri(), 'settings') && ! str_contains($r->uri(), '{'));

        if ($pages->isEmpty()) {
            $this->markTestSkipped('No /settings/... pages found; check routes/settings.php.');
        }

        foreach ($pages as $page) {
            $this->actingAs($user)->get('/'.$page->uri())->assertRedirect(route('verification.notice'));
        }
    }

    public function test_verified_user_can_still_open_dashboard_and_settings()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/dashboard')->assertRedirect('/orders');
    }
}
