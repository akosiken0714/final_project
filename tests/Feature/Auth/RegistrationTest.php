<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());

        RateLimiter::clear('register-failed:127.0.0.1');
        RateLimiter::clear('register-created:127.0.0.1');
    }

    private function data(array $over = []): array
    {
        return array_merge([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '09123456789',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => 'on',
        ], $over);
    }

    public function test_registration_screen_can_be_rendered()
    {
        $this->get(route('register'))->assertOk();
    }

    public function test_registration_needs_the_terms_box_ticked()
    {
        $this->post(route('register.store'), $this->data(['terms' => null]))
            ->assertSessionHasErrors('terms');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_new_users_can_register()
    {
        $response = $this->post(route('register.store'), $this->data());

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_new_accounts_are_always_customers_even_if_role_is_sent()
    {
        $this->post(route('register.store'), $this->data(['role' => 'admin']));

        $this->assertSame('customer', User::where('email', 'test@example.com')->firstOrFail()->role);
    }

    public function test_email_is_saved_in_lowercase()
    {
        $this->post(route('register.store'), $this->data(['email' => 'Maria@Gmail.com']));

        $this->assertDatabaseHas('users', ['email' => 'maria@gmail.com']);
    }

    public function test_same_email_with_different_capitals_is_a_duplicate()
    {
        User::factory()->create(['email' => 'maria@gmail.com']);

        $this->post(route('register.store'), $this->data(['email' => 'MARIA@GMAIL.COM']))
            ->assertSessionHasErrors('email');

        $this->assertSame(1, User::count());
        $this->assertGuest();
    }

    public function test_emails_that_do_not_make_sense_are_refused()
    {
        foreach (['not-an-email', 'maria@', 'asdf@asd', '@gmail.com', 'ma ria@gmail.com'] as $bad) {
            $this->post(route('register.store'), $this->data(['email' => $bad]))
                ->assertSessionHasErrors('email');
        }

        $this->assertSame(0, User::count());
        $this->assertGuest();
    }

    public function test_a_gigantic_password_is_refused()
    {
        $long = str_repeat('a', 129);

        $this->post(route('register.store'), $this->data(['password' => $long, 'password_confirmation' => $long]))
            ->assertSessionHasErrors('password');

        $this->assertGuest();
    }

    public function test_a_phone_sent_as_a_list_gives_an_error_not_a_crash()
    {
        $this->post(route('register.store'), $this->data(['phone' => ['09123456789']]))
            ->assertSessionHasErrors('phone');

        $this->assertGuest();
    }

    public function test_a_few_typos_do_not_lock_a_real_customer_out()
    {
        foreach (range(1, 6) as $i) {
            $this->post(route('register.store'), $this->data(['email' => 'typo']))
                ->assertSessionHasErrors('email');
        }

        $this->post(route('register.store'), $this->data());

        $this->assertAuthenticated();
    }

    public function test_too_many_wrong_tries_from_one_network_are_blocked()
    {
        foreach (range(1, 20) as $i) {
            RateLimiter::hit('register-failed:127.0.0.1', 600);
        }

        $this->post(route('register.store'), $this->data())
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertSame(0, User::count());
    }

    public function test_too_many_new_accounts_from_one_network_are_blocked()
    {
        foreach (range(1, 10) as $i) {
            RateLimiter::hit('register-created:127.0.0.1', 3600);
        }

        $this->post(route('register.store'), $this->data())
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_names_that_do_not_look_like_names_are_refused()
    {
        foreach (['kenkenkena323e32e2eeR^%^%!%%%@%@2', 'Maria123', '!!!', 'A', 'Maria <b>', '12345'] as $bad) {
            $this->post(route('register.store'), $this->data(['name' => $bad]))
                ->assertSessionHasErrors('name');
        }

        $this->assertSame(0, User::count());
    }

    public function test_real_looking_names_are_accepted()
    {
        foreach (['Maria Dela Cruz', "Jo-Ann D'Souza", 'Ma. Niña Nuñez', 'Kazuma'] as $i => $good) {
            $this->post(route('register.store'), $this->data(['name' => $good, 'email' => "person{$i}@example.com"]));

            $this->assertAuthenticated();
            $this->assertDatabaseHas('users', ['name' => $good]);
            $this->post(route('logout'));
        }
    }

    public function test_extra_spaces_in_a_name_are_cleaned()
    {
        $this->post(route('register.store'), $this->data(['name' => 'Maria     Dela   Cruz']));

        $this->assertDatabaseHas('users', ['name' => 'Maria Dela Cruz']);
    }

    public function test_well_known_email_typos_are_refused_with_a_hint()
    {
        foreach (['imako@gmil.com' => 'gmail.com', 'a@gmial.com' => 'gmail.com', 'b@yaho.com' => 'yahoo.com', 'c@hotmial.com' => 'hotmail.com'] as $bad => $meant) {
            $this->post(route('register.store'), $this->data(['email' => $bad]))
                ->assertSessionHasErrors(['email' => "Baka {$meant} ang ibig mong sabihin? Pakicheck ang email."]);
        }

        $this->assertSame(0, User::count());
    }

    public function test_password_needs_8_characters_big_letter_small_letter_and_number_but_no_symbol()
    {
        // The automated tests normally use a light password rule; here we switch on the real customer rule.
        Password::defaults(fn () => AppServiceProvider::strongPassword());

        foreach (['Short1a', 'alllowercase1', 'ALLUPPERCASE1', 'NoNumbersHere'] as $bad) {
            $this->post(route('register.store'), $this->data(['password' => $bad, 'password_confirmation' => $bad]))
                ->assertSessionHasErrors('password');
        }

        $this->assertGuest();

        $this->post(route('register.store'), $this->data(['password' => 'Maria2024', 'password_confirmation' => 'Maria2024']));

        $this->assertAuthenticated();
    }
}
