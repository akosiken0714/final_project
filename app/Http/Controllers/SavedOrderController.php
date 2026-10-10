<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\SavedOrder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SavedOrderController extends Controller
{
    // Save (or update, if the name already exists) a reusable order for the logged-in customer.
    public function store(Request $request)
    {
        $delivery = $request->input('fulfillment', Order::DELIVERY) !== Order::DROPOFF;

        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
            'service_id' => ['required', Rule::exists('services', 'id')->where('active', true)->whereNull('deleted_at')],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'fulfillment' => ['nullable', Rule::in(Order::FULFILLMENTS)],
            // A pin is optional here: a saved order without one just asks the customer to drop a pin when they reuse it.
            'address' => $delivery ? ['required', 'string', 'min:10', 'max:255'] : ['nullable', 'string', 'max:255'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'instructions' => ['nullable', 'string', 'max:500'],
        ], [
            'service_id.exists' => 'That service is not available right now.',
            'address.min' => 'Please enter a fuller address.',
        ]);

        $user = $request->user();

        if (! SavedOrder::named($user, $data['name']) && SavedOrder::countFor($user) >= SavedOrder::MAX_PER_USER) {
            throw ValidationException::withMessages([
                'name' => 'You can keep up to '.SavedOrder::MAX_PER_USER.' saved orders. Delete one first, or reuse an existing name.',
            ]);
        }

        SavedOrder::remember($user, $data['name'], $data);

        return back()->with('success', 'Saved as "'.trim($data['name']).'".');
    }

    public function destroy(Request $request, SavedOrder $savedOrder)
    {
        abort_unless($savedOrder->user_id === $request->user()->id, 404);

        $name = $savedOrder->name;
        $savedOrder->delete();

        return back()->with('success', "Removed \"{$name}\".");
    }
}
