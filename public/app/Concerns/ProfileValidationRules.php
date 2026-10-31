<?php

namespace App\Concerns;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules($userId),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * For a NEW account ($userId is null) the name must be a real-looking name: letters, spaces, dots,
     * hyphens and apostrophes only (Maria Dela Cruz, Jo-Ann D'Souza, Ma. Nena Nuñez), 2 to 60 characters.
     * Existing users editing their profile keep the lighter check, so an old name never blocks a save.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(?int $userId = null): array
    {
        if ($userId === null) {
            return ['required', 'string', 'min:2', 'max:60', 'regex:/^\p{L}[\p{L}\p{M}\s.\'’-]*$/u'];
        }

        return ['required', 'string', 'max:255'];
    }

    /**
     * Friendly messages for the name rules.
     *
     * @return array<string, string>
     */
    protected function nameMessages(): array
    {
        return [
            'name.required' => 'Kailangan ng pangalan.',
            'name.min' => 'Masyadong maikli ang pangalan.',
            'name.max' => 'Masyadong mahaba ang pangalan (60 letters ang max).',
            'name.regex' => 'Letters lang ang pwede sa pangalan (okay ang space, tuldok, gitling at apostrophe). Halimbawa: Maria Dela Cruz.',
        ];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * For a NEW account ($userId is null) the email must also look like name@domain.tld
     * (so "asdf@asd" is refused), must not be a well-known typo (gmil.com), and its domain must be able
     * to receive mail (a DNS lookup, which needs internet; it is skipped while running the automated tests).
     * Existing users editing their profile keep the lighter check, so an old address never blocks them,
     * unless $strict is true (used when an unverified account fixes its mistyped email).
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null, bool $strict = false): array
    {
        $unique = $userId === null
            ? Rule::unique(User::class)
            : Rule::unique(User::class)->ignore($userId);

        if ($userId === null || $strict) {
            return [
                'bail',
                'required',
                'string',
                'max:255',
                'regex:/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/',
                // Well-known typos such as gmil.com or yaho.com: a real domain, but surely not what the customer meant.
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value)) {
                        return;
                    }

                    $domain = mb_strtolower(substr((string) strrchr($value, '@'), 1));
                    $meant = $this->commonEmailTypos()[$domain] ?? null;

                    if ($meant !== null) {
                        $fail("Baka {$meant} ang ibig mong sabihin? Pakicheck ang email.");
                    }
                },
                app()->runningUnitTests() ? 'email:rfc' : 'email:rfc,dns',
                $unique,
            ];
        }

        return [
            'required',
            'string',
            'email',
            'max:255',
            $unique,
        ];
    }

    /**
     * Typo domain => the domain people meant. Only big providers, where a typo is far more likely than a real address.
     *
     * @return array<string, string>
     */
    protected function commonEmailTypos(): array
    {
        $typos = [];

        foreach ([
            'gmail.com' => ['gmial.com', 'gmil.com', 'gmai.com', 'gmal.com', 'gamil.com', 'gmaill.com', 'gnail.com', 'gmaul.com', 'gmeil.com', 'gmail.co', 'gmail.con', 'gmail.cm', 'gmail.om', 'gmail.comm', 'gmail.vom'],
            'yahoo.com' => ['yaho.com', 'yahooo.com', 'yahho.com', 'yhoo.com', 'yaoo.com', 'yahoo.con', 'yahoo.cm', 'yahoo.comm'],
            'hotmail.com' => ['hotmial.com', 'hotmal.com', 'hotmai.com', 'homail.com', 'hotmail.con', 'hotmail.cm'],
            'outlook.com' => ['outlok.com', 'outloook.com', 'outlook.con', 'outlook.cm'],
            'icloud.com' => ['iclod.com', 'icoud.com', 'icloud.con'],
        ] as $right => $wrongs) {
            foreach ($wrongs as $wrong) {
                $typos[$wrong] = $right;
            }
        }

        return $typos;
    }

    /**
     * Friendly messages for the email rules.
     *
     * @return array<string, string>
     */
    protected function emailMessages(): array
    {
        $looksWrong = 'Parang may mali sa email. Pakicheck ulit (halimbawa: maria@gmail.com).';

        return [
            'email.required' => 'Kailangan ng email address.',
            'email.regex' => $looksWrong,
            'email.email' => $looksWrong,
            'email.max' => 'Masyadong mahaba ang email (255 letters ang max).',
            'email.unique' => 'May account na gamit ang email na ito. Subukang mag-log in.',
        ];
    }

    /**
     * @return array<int, string>
     */
    protected function avatarRules(): array
    {
        return ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:3072'];
    }

    /**
     * @return array<int, string>
     */
    protected function phoneRules(bool $required = true): array
    {
        return [$required ? 'required' : 'nullable', 'string', 'regex:/^(09\d{9}|\+639\d{9})$/'];
    }

    /**
     * @return array<string, string>
     */
    protected function phoneMessages(): array
    {
        return ['phone.regex' => 'Use a Philippine number: 09XX XXX XXXX or +63 9XX XXX XXXX.'];
    }

    protected function cleanPhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $clean = preg_replace('/[\s\-()]/', '', $phone);

        return $clean === '' ? null : $clean;
    }
}
