<?php

namespace App\Http\Controllers\Settings;

use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
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

        if ($user->isAdmin() && User::where('role', 'admin')->count() <= 1) {
            return back()->withErrors(['password' => "You're the only admin, so this account can't be deleted."]);
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
