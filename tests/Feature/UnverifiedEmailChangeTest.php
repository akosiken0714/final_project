<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

// "Wrong email? Change it" on the verify page.
class UnverifiedEmailChangeTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_can_fix_a_mistyped_email_and_gets_a_new_link()
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['email' => 'maria@gmial.co']);

        $this->actingAs($user)
            ->post('/email/change', ['email' => '  Maria@Gmail.com '])
            ->assertRedirect(route('verification.notice'))
            ->assertSessionHas('status', 'email-changed');

        $this->assertSame('maria@gmail.com', $user->fresh()->email);
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_known_typos_and_nonsense_emails_are_refused_and_nothing_changes()
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['email' => 'maria@example.com']);

        foreach (['maria@gmil.com', 'asdf@asd', 'not-an-email'] as $bad) {
            $this->actingAs($user)->post('/email/change', ['email' => $bad])->assertSessionHasErrors('email');
        }

        $this->assertSame('maria@example.com', $user->fresh()->email);
        Notification::assertNothingSent();
    }

    public function test_an_email_that_belongs_to_someone_else_is_refused()
    {
        User::factory()->create(['email' => 'taken@example.com']);
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->post('/email/change', ['email' => 'TAKEN@example.com'])->assertSessionHasErrors('email');
    }

    public function test_typing_the_same_email_just_sends_the_link_again()
    {
        Notification::fake();
        $user = User::factory()->unverified()->create(['email' => 'same@example.com']);

        $this->actingAs($user)->post('/email/change', ['email' => 'same@example.com'])->assertSessionHasNoErrors();

        $this->assertSame('same@example.com', $user->fresh()->email);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_a_verified_account_cannot_change_its_email_this_way()
    {
        $user = User::factory()->create(['email' => 'verified@example.com']);

        $this->actingAs($user)
            ->post('/email/change', ['email' => 'other@example.com'])
            ->assertRedirect(route('dashboard'));

        $this->assertSame('verified@example.com', $user->fresh()->email);
    }

    public function test_guests_are_sent_to_login()
    {
        $this->post('/email/change', ['email' => 'a@example.com'])->assertRedirect(route('login'));
    }
}
