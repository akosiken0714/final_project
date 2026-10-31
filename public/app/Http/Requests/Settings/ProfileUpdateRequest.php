<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => $this->cleanPhone($this->input('phone'))]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            'phone' => $this->phoneRules(true),
            'address' => ['nullable', 'string', 'max:255'],
            'delivery_notes' => ['nullable', 'string', 'max:200'],
            // The usual pickup/delivery pin: both numbers or neither.
            'default_lat' => ['nullable', 'numeric', 'between:-90,90', 'required_with:default_lng'],
            'default_lng' => ['nullable', 'numeric', 'between:-180,180', 'required_with:default_lat'],
            // Changing your email (your login) needs your password, so a stolen open session can't lock you out.
            'current_password' => $this->emailChanged() ? ['required', 'current_password'] : ['nullable'],
        ];
    }

    private function emailChanged(): bool
    {
        return mb_strtolower(trim((string) $this->input('email'))) !== mb_strtolower((string) $this->user()->email);
    }

    public function messages(): array
    {
        return $this->phoneMessages() + [
            'current_password.required' => 'Enter your current password to change your email.',
            'current_password.current_password' => 'That password is not correct.',
        ];
    }
}
