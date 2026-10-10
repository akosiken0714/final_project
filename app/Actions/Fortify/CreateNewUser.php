<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Support\AvatarStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $key = 'register:'.request()->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Too many sign-up attempts. Please try again in a few minutes.',
            ]);
        }
        RateLimiter::hit($key, 600);

        $input['phone'] = $this->cleanPhone($input['phone'] ?? null);

        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'phone' => $this->phoneRules(true),
            'address' => ['nullable', 'string', 'max:255'],
            'avatar' => $this->avatarRules(),
        ], $this->phoneMessages() + ['avatar.mimes' => 'Picture must be a JPG, PNG or WebP.', 'avatar.max' => 'Picture must be 3 MB or smaller.'])->validate();

        $user = new User;
        $user->fill([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'phone' => $input['phone'],
            'address' => $input['address'] ?? null,
        ]);

        // Optional profile picture. Checked last so a bad picture never leaves a half-made account.
        if (isset($input['avatar']) && $input['avatar'] instanceof UploadedFile) {
            $user->avatar_path = AvatarStore::store($input['avatar']);
        }

        $user->save();

        return $user;
    }
}
