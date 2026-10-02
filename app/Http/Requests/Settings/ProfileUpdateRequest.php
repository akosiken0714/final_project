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

    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            'phone' => $this->phoneRules(true),
            'address' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return $this->phoneMessages();
    }
}