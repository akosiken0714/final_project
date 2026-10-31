<?php

namespace App\Http\Controllers;

use App\Concerns\ProfileValidationRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// "Wrong email? Change it" on the verify-email page. Only for accounts that are NOT verified yet,
// so a mistyped address never traps a new customer, and a verified account's email cannot be swapped here.
class UnverifiedEmailController extends Controller
{
    use ProfileValidationRules;

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('dashboard');
        }

        // Same cleaning as sign-up: capital letters do not matter.
        $email = $request->input('email');
        $request->merge(['email' => is_string($email) ? mb_strtolower(trim($email)) : $email]);

        // Same strict checks as a brand-new sign-up (real-looking email, known typos, domain can receive mail, not taken).
        $data = $request->validate([
            'email' => $this->emailRules($user->id, strict: true),
        ], $this->emailMessages());

        if ($data['email'] !== $user->email) {
            $user->forceFill(['email' => $data['email'], 'email_verified_at' => null])->save();
        }

        $user->sendEmailVerificationNotification();

        return redirect()->route('verification.notice')->with('status', 'email-changed');
    }
}
