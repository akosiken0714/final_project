<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    // Safety net for the future: if someone adds a new write route and forgets a limit, this fails.
    public function test_every_app_route_that_changes_data_has_a_rate_limit(): void
    {
        $missing = [];

        foreach (Route::getRoutes() as $route) {
            if (array_intersect($route->methods(), ['POST', 'PUT', 'PATCH', 'DELETE']) === []) {
                continue;
            }

            // Fortify (login, register...) has its own limiters; here we check OUR controllers.
            if (! str_starts_with($route->getActionName(), 'App\\Http\\Controllers')) {
                continue;
            }

            $limited = collect($route->gatherMiddleware())
                ->contains(fn ($m) => is_string($m) && str_starts_with($m, 'throttle'));

            if (! $limited) {
                $missing[] = implode('|', $route->methods()).' '.$route->uri();
            }
        }

        $this->assertSame([], $missing, 'These routes change data but have no rate limit: '.implode(', ', $missing));
    }

    public function test_marking_notifications_read_is_limited_to_30_a_minute(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 30; $i++) {
            $this->actingAs($user)->post('/notifications/read-all')->assertSessionHasNoErrors();
        }

        $this->actingAs($user)->post('/notifications/read-all')->assertStatus(429);
    }

    public function test_the_home_page_and_dashboard_redirect_still_work(): void
    {
        $this->get('/')->assertOk();

        $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/dashboard')->assertRedirect('/admin');
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertRedirect('/orders');
    }
}
