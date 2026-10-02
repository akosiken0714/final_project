<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }

    public function test_customers_are_sent_to_their_orders()
    {
        $this->actingAs(User::factory()->create())->get(route('dashboard'))->assertRedirect('/orders');
    }

    public function test_admins_are_sent_to_the_admin_area()
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))->get(route('dashboard'))->assertRedirect('/admin');
    }
}