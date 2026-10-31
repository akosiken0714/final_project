<?php

namespace App\Http\Controllers\Settings;

use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Order;
use App\Support\AvatarStore;
use App\Support\DeliveryZone;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    use ProfileValidationRules;

    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'zone' => DeliveryZone::forPage(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $data = $request->validated();
        unset($data['current_password']);

        $request->user()->fill($data);

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    // Upload or replace the profile picture.
    public function avatar(Request $request): RedirectResponse
    {
        $request->validate(['avatar' => ['required', ...$this->avatarRules()]], [
            'avatar.required' => 'Choose a picture first.',
            'avatar.mimes' => 'Picture must be a JPG, PNG or WebP.',
            'avatar.max' => 'Picture must be 3 MB or smaller.',
        ]);

        $user = $request->user();
        $old = $user->avatar_path;

        $user->avatar_path = AvatarStore::store($request->file('avatar'));
        $user->save();
        AvatarStore::delete($old);

        return back()->with('success', 'Profile picture updated.');
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();

        AvatarStore::delete($user->avatar_path);
        $user->avatar_path = null;
        $user->save();

        return back()->with('success', 'Profile picture removed.');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        // Admins never delete themselves from here: removing an admin goes through People > Delete account,
        // where another admin confirms with their own password, and it is saved in the activity log.
        // (Checked on the server, because hiding the button alone is not security.)
        if ($user->isAdmin()) {
            return back()->withErrors(['password' => "Admins can't delete their own account. Ask another admin to remove it from the People page."]);
        }

        // Staff (cashier) accounts are managed by an admin too, so the shop is never left without its team by accident.
        if ($user->isStaff()) {
            return back()->withErrors(['password' => "Staff can't delete their own account. Ask an admin to remove your access."]);
        }

        // Same rule as the admin delete: no orphaned laundry. Finish or cancel the orders first.
        $unfinished = $user->orders()->whereNotIn('status', [Order::CLAIMED, Order::CANCELLED])->count();
        if ($unfinished > 0) {
            $word = $unfinished === 1 ? 'order' : 'orders';
            $done = $unfinished === 1 ? 'it is' : 'they are';

            return back()->withErrors(['password' => "You still have {$unfinished} unfinished {$word}. Please wait until {$done} done, or cancel a Pending one, then try again."]);
        }

        $oldAvatar = $user->avatar_path;

        Auth::logout();

        // Soft delete: order history stays, personal details are wiped.
        $user->forceFill([
            'email' => "deleted-{$user->id}@deleted.invalid",
            'phone' => null,
            'address' => null,
            'delivery_notes' => null,
            'default_lat' => null,
            'default_lng' => null,
            'avatar_path' => null,
        ])->save();
        AvatarStore::delete($oldAvatar);
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
