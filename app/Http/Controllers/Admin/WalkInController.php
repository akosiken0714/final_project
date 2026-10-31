<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use App\Support\Activity;
use App\Support\Intake;
use App\Support\PhotoSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

// A customer walks in with a bag: staff (or an admin) types the order in at the counter.
// The laundry is weighed right away, so the amount entered here is the real one (no "customer estimated").
// Walk-ins always hand over at the shop (drop-off) and pay cash. Delivery orders stay an online-only thing.
class WalkInController extends Controller
{
    use ProfileValidationRules;

    // The form. ?q= searches existing customers by name, phone or email (the page reloads only the matches).
    public function create(Request $request): Response
    {
        $q = trim($this->text($request, 'q'));
        $matches = [];

        if (mb_strlen($q) >= 2) {
            $like = '%'.str_replace(['%', '_'], '', $q).'%';

            $matches = User::where('role', User::CUSTOMER)
                ->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('phone', 'like', $like)->orWhere('email', 'like', $like))
                ->orderBy('name')
                ->limit(8)
                ->get(['id', 'name', 'phone', 'email'])
                ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'phone' => $u->phone, 'email' => $u->email])
                ->all();
        }

        return Inertia::render('Admin/WalkIn', [
            'services' => Service::where('active', true)->orderBy('name')->get(['id', 'name', 'unit', 'price']),
            'q' => $q,
            'matches' => $matches,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // Phone numbers are typed in many ways (0917 123 4567, 0917-123-4567): tidy them before checking.
        $phone = $request->input('phone');
        $request->merge(['phone' => is_string($phone) ? $this->cleanPhone($phone) : null]);

        $existing = $request->filled('customer_id');

        $data = $request->validate([
            'customer_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', User::CUSTOMER)->whereNull('deleted_at'))],
            // A NEW customer needs a real name and a phone number (it is the only way to reach them).
            'name' => $existing ? ['nullable'] : $this->nameRules(),
            'phone' => $existing ? ['nullable'] : $this->phoneRules(true),
            'service_id' => ['required', Rule::exists('services', 'id')->where('active', true)->whereNull('deleted_at')],
            'quantity' => ['required', 'numeric', 'min:0.1', 'max:200', 'decimal:0,2'],
            'instructions' => ['nullable', 'string', 'max:500'],
            'paid_now' => ['nullable', 'boolean'],
            // Optional intake record, taken in the same step (what was handed over at the counter).
            'item_count' => ['nullable', 'integer', 'min:1', 'max:500'],
            'intake_notes' => ['nullable', 'string', 'max:500'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], $this->nameMessages() + $this->phoneMessages() + [
            'customer_id.exists' => 'That customer could not be found. Search again.',
            'service_id.required' => 'Pick a service.',
            'service_id.exists' => 'That service is not available.',
            'quantity.required' => 'Enter the weight or amount.',
            'quantity.numeric' => 'Enter a number, like 4.6.',
            'quantity.min' => 'The amount must be at least 0.1.',
            'quantity.max' => 'That amount is too large. The most is 200.',
            'quantity.decimal' => 'Use at most 2 decimal places.',
            'item_count.integer' => 'Enter a whole number of items (1, 2, 3…).',
            'item_count.max' => 'That is too many items for one order (500 is the most).',
            'photo.mimes' => 'Photo must be a JPG, PNG or WebP.',
            'photo.max' => 'Photo must be 4 MB or smaller.',
        ]);

        // A counter photo only makes sense together with an item count.
        if ($request->hasFile('photo') && empty($data['item_count'])) {
            return back()->withErrors(['item_count' => 'Enter how many items there are to save the photo with it.']);
        }

        // Two people with the same number would be confusing. If the number is already ours, use that customer.
        if (! $existing) {
            $same = User::where('phone', $data['phone'])->first();
            if ($same) {
                return back()->withErrors(['phone' => "{$same->name} already uses this number. Search for them above and pick them instead."]);
            }
        }

        $staff = $request->user();
        $service = Service::where('active', true)->findOrFail((int) $data['service_id']);
        $quantity = round((float) $data['quantity'], 2);
        $paidNow = $request->boolean('paid_now');

        // Clean the photo first: a bad file is refused before anything is saved.
        $photoPath = $request->hasFile('photo') ? PhotoSanitizer::store($request->file('photo')) : null;

        try {
            $order = DB::transaction(function () use ($data, $existing, $staff, $service, $quantity, $paidNow, $photoPath) {
                $customer = $existing ? User::findOrFail((int) $data['customer_id']) : $this->makeWalkInCustomer($data['name'], $data['phone']);

                $order = Order::create([
                    'user_id' => $customer->id,
                    'service_id' => $service->id,
                    'quantity' => $quantity,
                    'total' => round((float) $service->price * $quantity, 2),
                    'instructions' => $data['instructions'] ?? null,
                    'status' => 'Pending',
                    'fulfillment' => Order::DROPOFF,
                    'payment_method' => Order::CASH,
                    'payment_status' => Order::UNPAID,
                    'source' => Order::WALK_IN,
                    'created_by' => $staff->id,
                ]);

                if (! empty($data['item_count'])) {
                    Intake::save($order, $staff, (int) $data['item_count'], $data['intake_notes'] ?? null, $photoPath);
                }

                if ($paidNow) {
                    $order->markCashPaid();
                }

                return $order;
            });
        } catch (\Throwable $e) {
            // Nothing was saved, so do not leave the cleaned photo behind.
            if ($photoPath) {
                Storage::disk('local')->delete($photoPath);
            }

            throw $e;
        }

        $order->load('user');
        $customer = $order->user;
        $tag = Activity::tag($order->id);
        $qty = rtrim(rtrim(number_format($quantity, 2, '.', ''), '0'), '.');

        Activity::log(
            'order.placed',
            "Order {$tag} created at the counter by {$staff->name} for {$customer->name}: {$service->name} × {$qty} (walk-in, cash)",
            $order,
            $staff->id,
            ['source' => Order::WALK_IN],
        );

        if (! empty($data['item_count'])) {
            Activity::log('order.intake', "Order {$tag} received at the counter: ".Intake::itemsLabel((int) $data['item_count']), $order, $staff->id, ['items' => (int) $data['item_count']]);
        }

        if ($paidNow) {
            Activity::log('payment.cash', 'Cash '.Activity::money($order->amount_due)." received for order {$tag} (at the counter)", $order, $staff->id);
        }

        // Registered customers get a bell message. Walk-in customers without an email have no login, so this does nothing for them.
        Activity::notifyUser($customer, "We received your laundry ({$tag})", "{$service->name} × {$qty} {$service->unit}: ".Activity::money($order->amount_due).'.', '/orders', $order->id);

        return redirect("/orders/{$order->id}/receipt")->with('success', "Walk-in order {$tag} created for {$customer->name}. Print the claim slip for the customer.");
    }

    // A customer with no email: they can never log in (nobody knows the random password), staff handle their orders.
    private function makeWalkInCustomer(string $name, string $phone): User
    {
        $user = new User;
        $user->fill([
            'name' => $name,
            'phone' => $phone,
            'email' => null,
            'password' => Str::random(40),
        ]);
        $user->role = User::CUSTOMER;
        $user->save();

        return $user;
    }
}
