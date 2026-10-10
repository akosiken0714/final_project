<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

// Lets an admin create an account for someone (a walk-in customer, or another staff member).
class UserController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function store(Request $request)
    {
        $input = $request->all();
        $input['phone'] = $this->cleanPhone($input['phone'] ?? null);

        $data = Validator::make($input, [
            ...$this->profileRules(),
            'phone' => $this->phoneRules(false),
            'address' => ['nullable', 'string', 'max:255'],
            'role' => ['required', 'in:customer,admin'],
            'password' => $this->passwordRules(),
            // Creating accounts (admins especially) needs the admin's own password.
            'admin_password' => ['required', 'current_password'],
        ], $this->phoneMessages() + ['admin_password.current_password' => 'Your admin password is not correct.'])->validate();

        $user = new User;
        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
        ]);
        // role is never mass-assigned: only this admin-only form can set it
        $user->role = $data['role'];
        // The admin vouches for this person, so no email-verification step is needed.
        $user->email_verified_at = now();
        $user->save();

        Activity::log('user.created', "Account created: {$user->name} ({$data['role']})", null, $request->user()->id);

        return back()->with('success', "Account created for {$user->name}. Share the password with them privately.");
    }
}
