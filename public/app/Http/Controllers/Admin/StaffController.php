<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Activity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

// Admin only. Staff are the counter team (cashiers): they can run the order desk and take walk-in orders,
// but they never see revenue or analytics, history, pricing, or the people list, and they can't delete accounts.
class StaffController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function index(): Response
    {
        return Inertia::render('Admin/Staff', [
            'staff' => User::where('role', User::STAFF)->orderBy('name')->get(['id', 'name', 'email', 'phone', 'created_at']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $input = $request->all();
        $input['phone'] = is_string($input['phone'] ?? null) ? $this->cleanPhone($input['phone']) : null;

        $data = Validator::make($input, [
            ...$this->profileRules(),
            'phone' => $this->phoneRules(false),
            'password' => $this->passwordRules(),
            // Giving someone access to the till needs the admin's own password.
            'admin_password' => ['required', 'current_password'],
        ], $this->phoneMessages() + ['admin_password.current_password' => 'Your admin password is not correct.'])->validate();

        $user = new User;
        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
        ]);
        // role is never mass-assigned: only this admin-only form can set it
        $user->role = User::STAFF;
        // The admin vouches for this person, so no email-verification step is needed.
        $user->forceFill(['email_verified_at' => now()]);
        $user->save();

        Activity::log('user.staff_added', "Staff account created: {$user->name}", null, $request->user()->id);

        return back()->with('success', "Staff account created for {$user->name}. Share the password with them privately.");
    }

    // Takes staff access away. The account stays (as a normal customer), so any orders it handled keep their history.
    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isStaff(), 404);

        $request->validate(
            ['admin_password' => ['required', 'current_password']],
            ['admin_password.current_password' => 'Your admin password is not correct.'],
        );

        $user->role = User::CUSTOMER;
        $user->save();

        Activity::log('user.staff_removed', "Staff access removed: {$user->name}", null, $request->user()->id);

        return back()->with('success', "{$user->name} no longer has staff access.");
    }
}
