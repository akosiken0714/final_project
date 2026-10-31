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

    // Sign-up limits, per IP address. Wrong tries (typos, bad emails) are counted apart from accounts
    // that were really created, so a customer who mistypes a few times is not locked out,
    // but a bot that spams the form (or makes accounts in bulk) still gets stopped.
    private const MAX_FAILED_TRIES = 20;   // wrong tries per 10 minutes

    private const FAILED_WINDOW = 600;

    private const MAX_NEW_ACCOUNTS = 10;   // accounts created per hour

    private const CREATED_WINDOW = 3600;

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $ip = (string) request()->ip();
        $failedKey = 'register-failed:'.$ip;
        $createdKey = 'register-created:'.$ip;

        foreach ([[$failedKey, self::MAX_FAILED_TRIES], [$createdKey, self::MAX_NEW_ACCOUNTS]] as [$key, $max]) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $minutes = max(1, (int) ceil(RateLimiter::availableIn($key) / 60));

                throw ValidationException::withMessages([
                    'email' => "Masyadong maraming sign-up attempts galing sa network na ito. Subukan ulit pagkatapos ng {$minutes} minuto.",
                ]);
            }
        }

        // Same email with different capital letters is the same account. Login already lowercases the email
        // (config/fortify.php: lowercase_usernames), so we save it lowercase too, otherwise "Maria@Gmail.com"
        // could register but never log in. (Laravel itself already trims extra spaces.)
        if (isset($input['email']) && is_string($input['email'])) {
            $input['email'] = mb_strtolower(trim($input['email']));
        }

        // "Maria    Cruz " becomes "Maria Cruz".
        if (isset($input['name']) && is_string($input['name'])) {
            $input['name'] = trim((string) preg_replace('/\s+/u', ' ', $input['name']));
        }

        // A phone sent as a list or other odd value becomes null, so the "required" rule fails nicely instead of crashing.
        $input['phone'] = $this->cleanPhone(is_string($input['phone'] ?? null) ? $input['phone'] : null);

        try {
            Validator::make($input, [
                ...$this->profileRules(),
                'password' => $this->passwordRules(),
                'phone' => $this->phoneRules(true),
                'address' => ['nullable', 'string', 'max:255'],
                'avatar' => $this->avatarRules(),
                'terms' => ['accepted'],
            ], $this->phoneMessages() + $this->emailMessages() + $this->nameMessages() + [
                'avatar.mimes' => 'Picture must be a JPG, PNG or WebP.',
                'avatar.max' => 'Picture must be 3 MB or smaller.',
                'terms.accepted' => 'Please agree to the Terms of Service and Privacy Policy to create an account.',
            ])->validate();

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
        } catch (ValidationException $e) {
            RateLimiter::hit($failedKey, self::FAILED_WINDOW);

            throw $e;
        }

        $user->save();
        RateLimiter::hit($createdKey, self::CREATED_WINDOW);

        return $user;
    }
}
