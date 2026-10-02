<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => ['required', Rule::exists('services', 'id')->where('active', true)],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'address' => ['required', 'string', 'min:10', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:500'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'photo_confirmed' => $this->hasFile('photo') ? ['accepted'] : ['nullable'],
        ];
    }

    public function messages(): array
    {
        return [
            'service_id.exists' => 'That service is not available.',
            'quantity.integer' => 'Enter a whole number (1, 2, 3…).',
            'address.required' => 'Tell us where to pick up or deliver.',
            'address.min' => 'Please enter a fuller address.',
            'photo.mimes' => 'Photo must be a JPG, PNG or WebP.',
            'photo.max' => 'Photo must be 4 MB or smaller.',
            'photo_confirmed.accepted' => 'Please tick the box to confirm your photo.',
        ];
    }
}