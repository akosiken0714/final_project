<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminCustomersPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_customers_come_in_pages_of_24(): void
    {
        User::factory()->count(30)->create();
        $admin = User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->get('/admin/customers')
            ->assertInertia(fn (Assert $page) => $page->component('Admin/Customers')
                ->has('customers.data', 24)
                ->where('customers.last_page', 2));

        $this->actingAs($admin)->get('/admin/customers?page=2')
            ->assertInertia(fn (Assert $page) => $page->has('customers.data', 6));
    }

    public function test_search_still_works_with_pages(): void
    {
        User::factory()->create(['name' => 'Maria Santos']);
        User::factory()->count(5)->create();
        $admin = User::factory()->create(['role' => 'admin', 'two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->get('/admin/customers?q=Maria')
            ->assertInertia(fn (Assert $page) => $page->has('customers.data', 1)->where('search', 'Maria'));
    }

    public function test_the_admin_and_staff_are_not_listed_as_customers(): void
    {
        $customer = User::factory()->create(['name' => 'Maria Santos']);
        User::factory()->create(['name' => 'Cashier Ana', 'role' => 'staff']);
        $admin = User::factory()->create(['name' => 'Boss Admin', 'role' => 'admin', 'two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->get('/admin/customers')
            ->assertInertia(fn (Assert $page) => $page->has('customers.data', 1)
                ->where('customers.data.0.id', $customer->id)
                ->where('totals.customers', 1));
    }
}
