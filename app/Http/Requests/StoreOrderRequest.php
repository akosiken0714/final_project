<?php

namespace App\Http\Requests;

use App\Models\Order;
use App\Models\SavedOrder;
use App\Support\DeliveryZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    // Older forms and tests that don't send these still work: delivery + cash.
    protected function prepareForValidation(): void
    {
        $this->merge([
            'fulfillment' => $this->input('fulfillment') ?: Order::DELIVERY,
            'payment_method' => $this->input('payment_method') ?: Order::CASH,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $delivery = $this->input('fulfillment') === Order::DELIVERY;

        return [
            'service_id' => ['required', Rule::exists('services', 'id')->where('active', true)],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'fulfillment' => ['required', Rule::in(Order::FULFILLMENTS)],
            // Delivery needs an address and a pin on the map. Drop-off needs neither.
            'address' => $delivery ? ['required', 'string', 'min:10', 'max:255'] : ['nullable', 'string', 'max:255'],
            'lat' => $delivery ? ['required', 'numeric', 'between:-90,90'] : ['nullable'],
            'lng' => $delivery ? ['required', 'numeric', 'between:-180,180'] : ['nullable'],
            'payment_method' => ['required', Rule::in(Order::PAYMENT_METHODS)],
            'instructions' => ['nullable', 'string', 'max:500'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'photo_confirmed' => $this->hasFile('photo') ? ['accepted'] : ['nullable'],
            // optional: "Save this order for next time" under this name
            'save_as' => ['nullable', 'string', 'max:40'],
            // optional: the saved order this one was started from (moves it to the front of the list)
            'saved_order_id' => ['nullable', 'integer'],
            // optional: remember this address and pin as the customer's usual spot
            'save_default_spot' => ['nullable', 'boolean'],
        ];
    }

    // Check the saved-order limit and the delivery area BEFORE the order is placed,
    // so nothing is half-done when the answer is "no".
    /**
     * @param  Validator  $validator
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            if ($this->input('fulfillment') === Order::DELIVERY) {
                $zone = DeliveryZone::quote((float) $this->input('lat'), (float) $this->input('lng'));

                if (! $zone['deliverable']) {
                    $v->errors()->add('lat', $zone['message']);

                    return;
                }
            }

            $name = trim((string) $this->input('save_as'));
            $user = $this->user();

            if ($name === '' || ! $user) {
                return;
            }

            if (! SavedOrder::named($user, $name) && SavedOrder::countFor($user) >= SavedOrder::MAX_PER_USER) {
                $v->errors()->add('save_as', 'You already have '.SavedOrder::MAX_PER_USER.' saved orders. Delete one first, or reuse an existing name.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'service_id.exists' => 'That service is not available.',
            'quantity.integer' => 'Enter a whole number (1, 2, 3…).',
            'address.required' => 'Tell us where to pick up or deliver.',
            'address.min' => 'Please enter a fuller address.',
            'lat.required' => 'Drop a pin on the map so we know where to go.',
            'lng.required' => 'Drop a pin on the map so we know where to go.',
            'photo.mimes' => 'Photo must be a JPG, PNG or WebP.',
            'photo.max' => 'Photo must be 4 MB or smaller.',
            'photo_confirmed.accepted' => 'Please tick the box to confirm your photo.',
        ];
    }
}
