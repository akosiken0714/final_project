<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge(['name' => trim((string) $this->input('name'))]);
        }
    }

    public function rules(): array
    {
        $service = $this->route('service');
        $req = $service ? 'sometimes' : 'required';

        return [
            'name' => [$req, 'string', 'max:100', Rule::unique('services', 'name')->ignore($service?->id)],
            'unit' => [$req, Rule::in(['kg', 'load'])],
            'price' => [$req, 'numeric', 'gt:0', 'max:10000'],
            'active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'A service with that name already exists.',
            'price.gt' => 'Price must be more than ₱0.',
            'price.max' => 'Price can be at most ₱10,000.',
        ];
    }
}
