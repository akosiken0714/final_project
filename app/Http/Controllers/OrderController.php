<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Models\SavedOrder;
use App\Models\Service;
use App\Services\Payments\Payments;
use App\Support\Activity;
use App\Support\DeliveryZone;
use App\Support\OrderViews;
use App\Support\PhotoSanitizer;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $mine = Order::where('user_id', $user->id);
        // Each finished order also carries the customer's star rating (if the ratings table exists yet).
        $with = Schema::hasTable('order_ratings') ? ['service', 'rating'] : ['service'];
        // What the shop recorded at the counter (item count, condition notes, photo). Only after `php artisan migrate`.
        if (Schema::hasTable('order_intakes')) {
            $with[] = 'intake.receiver';
        }
        $list = OrderViews::resolve($request, $mine, $with, true);

        // Stats and "Reorder last" use ALL of this customer's orders, whichever tab is open.
        $last = Order::where('user_id', $user->id)->latest()->orderByDesc('id')->first(['id', 'service_id', 'quantity']);

        return Inertia::render('Orders/Index', $list + [
            'stats' => [
                'orders' => Order::where('user_id', $user->id)->count(),
                'inProgress' => Order::where('user_id', $user->id)->where('status', 'In Progress')->count(),
                // what the customer actually paid for completed orders: laundry + delivery
                'spent' => (float) Order::where('user_id', $user->id)->where('status', Order::CLAIMED)->selectRaw('coalesce(sum(total + delivery_fee), 0) as s')->value('s'),
            ],
            'last' => $last ? ['service_id' => $last->service_id, 'quantity' => $last->quantity] : null,
            'saved' => SavedOrder::cardsFor($user),
            'maxSaved' => SavedOrder::MAX_PER_USER,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Orders/Create', [
            'services' => Service::where('active', true)->get(),
            'saved' => SavedOrder::cardsFor($request->user()),
            'maxSaved' => SavedOrder::MAX_PER_USER,
            'zone' => DeliveryZone::forPage(),
            'demoPayments' => Payments::isDemo(),
            'readyHours' => (int) config('laundry.shop.ready_hours', 24),
        ]);
    }

    public function store(StoreOrderRequest $request): RedirectResponse
    {
        $user = $request->user();
        $v = $request->validated();
        $service = Service::where('active', true)->findOrFail((int) $v['service_id']);

        $delivery = $v['fulfillment'] === Order::DELIVERY;

        // The server decides the fee from the pin, whatever the page showed.
        $zone = $delivery ? DeliveryZone::quote((float) $v['lat'], (float) $v['lng']) : null;

        $data = [
            'user_id' => $user->id,
            'service_id' => $service->id,
            'quantity' => $v['quantity'],
            'total' => $service->price * $v['quantity'],
            'instructions' => $v['instructions'] ?? null,
            'fulfillment' => $v['fulfillment'],
            'address' => $delivery ? $v['address'] : null,
            'lat' => $delivery ? $v['lat'] : null,
            'lng' => $delivery ? $v['lng'] : null,
            'distance_km' => $zone['distance_km'] ?? null,
            'delivery_fee' => $zone['fee'] ?? 0,
            'payment_method' => $v['payment_method'],
            'payment_status' => Order::UNPAID,
            'pickup_date' => $v['pickup_date'] ?? null,
            'pickup_slot' => $v['pickup_slot'] ?? null,
        ];

        if ($request->hasFile('photo')) {
            $data['photo'] = PhotoSanitizer::store($request->file('photo'));
        }

        $order = Order::create($data);

        $tag = Activity::tag($order->id);
        $qty = rtrim(rtrim(number_format((float) $v['quantity'], 2, '.', ''), '0'), '.');
        $how = ($delivery ? 'delivery' : 'drop-off').', '.($v['payment_method'] === 'gcash' ? 'GCash' : 'cash');
        Activity::log('order.placed', "Order {$tag} placed by {$user->name}: {$service->name} × {$qty} ({$how})", $order, $user->id);
        Activity::notifyAdmins("New order {$tag}", "{$user->name} · {$service->name} × {$qty}", '/admin', $order->id);

        // The customer's usual spot: saved when they tick the box, or automatically the first time
        // they order delivery. Either way it can be changed or cleared in Settings > Profile.
        if ($delivery) {
            if ($request->boolean('save_default_spot')) {
                $user->forceFill(['default_lat' => $v['lat'], 'default_lng' => $v['lng'], 'address' => $v['address']])->save();
            } elseif ($user->default_lat === null) {
                $user->forceFill(['default_lat' => $v['lat'], 'default_lng' => $v['lng'], 'address' => $user->address ?: $v['address']])->save();
            }
        }

        $fields = [
            'service_id' => $v['service_id'],
            'quantity' => $v['quantity'],
            'address' => $delivery ? $v['address'] : '',
            'fulfillment' => $v['fulfillment'],
            'lat' => $delivery ? $v['lat'] : null,
            'lng' => $delivery ? $v['lng'] : null,
            'instructions' => $v['instructions'] ?? null,
        ];

        // Optional: "Save this order for next time". Never saves the photo.
        if ($request->filled('save_as')) {
            SavedOrder::remember($user, $request->input('save_as'), $fields);
        } elseif ($request->filled('saved_order_id')) {
            // Started from a saved order: it moves to the front of the list.
            SavedOrder::markUsed($user, (int) $request->input('saved_order_id'));
        }

        if ($order->payment_method === Order::GCASH) {
            return redirect("/orders/{$order->id}/pay")->with('success', 'Order placed! Finish your GCash payment to confirm it.');
        }

        return redirect('/orders')->with('success', "Order placed! We'll update you as it moves along.");
    }

    // Photos are private: only the owner or an admin can view them.
    /**
     * @return StreamedResponse
     */
    // A printable receipt / claim slip. The customer who owns the order, or an admin, can open it.
    // Cancelled orders have nothing to claim, so they get no receipt.
    public function receipt(Request $request, Order $order): \Inertia\Response
    {
        $user = $request->user();
        abort_unless($user->isShop() || $order->user_id === $user->id, 404);
        abort_if($order->status === Order::CANCELLED, 404);

        $order->load(['service', 'user']);
        // Items counted at the counter (only after `php artisan migrate`).
        $items = Schema::hasTable('order_intakes') ? $order->intake?->item_count : null;

        return Inertia::render('Orders/Receipt', [
            'order' => [
                'id' => $order->id,
                'status' => $order->status,
                'created_at' => $order->created_at?->toIso8601String(),
                'fulfillment' => $order->fulfillment,
                'address' => $order->address,
                'pickup_date' => $order->pickup_date?->format('Y-m-d'),
                'pickup_slot' => $order->pickup_slot,
                'instructions' => $order->instructions,
                'quantity' => $order->quantity,
                'total' => (float) $order->total,
                'delivery_fee' => (float) $order->delivery_fee,
                'amount_due' => $order->amount_due,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'payment_reference' => $order->payment_reference,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'items_received' => $items,
            ],
            'service' => [
                'name' => $order->service?->name,
                'unit' => $order->service?->unit,
                'price' => $order->service ? (float) $order->service->price : null,
            ],
            'customer' => ['name' => $order->user?->name, 'phone' => $order->user?->phone],
            'backUrl' => $user->isShop() ? '/admin' : '/orders',
        ]);
    }

    public function photo(Request $request, Order $order)
    {
        $user = $request->user();
        abort_unless($order->photo && ($user->isShop() || $order->user_id === $user->id), 404);

        // Older photos may still sit in the public folder, so check both.
        $disk = $this->photoDisk($order->photo);
        abort_if($disk === null, 404);

        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk($disk);

        return $storage->response($order->photo, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroyPhoto(Request $request, Order $order): RedirectResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        if ($order->status !== 'Pending') {
            return back()->withErrors(['photo' => 'The photo can only be removed before we start your order.']);
        }

        if ($order->photo) {
            $order->deletePhotoFiles();
            $order->update(['photo' => null]);
        }

        return back()->with('success', 'Photo removed.');
    }

    // The customer cancels their own order, only while it is still Pending and not yet paid.
    public function cancel(Request $request, Order $order): RedirectResponse
    {
        abort_unless($order->user_id === $request->user()->id, 404);

        if ($order->status !== 'Pending') {
            return back()->withErrors(['cancel' => 'We already started this order, so it can no longer be cancelled here. Please contact the shop.']);
        }

        if ($order->isPaid()) {
            return back()->withErrors(['cancel' => 'This order is already paid. Please contact the shop to cancel it and arrange a refund.']);
        }

        $order->update(['status' => Order::CANCELLED]);

        DB::table('order_status_logs')->insert([
            'order_id' => $order->id,
            'changed_by' => $request->user()->id,
            'from_status' => 'Pending',
            'to_status' => Order::CANCELLED,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $tag = Activity::tag($order->id);
        Activity::log('order.cancelled', "Order {$tag} cancelled by the customer", $order, $request->user()->id);
        Activity::notifyAdmins("Order {$tag} was cancelled", ($request->user()->name ?? 'A customer').' cancelled this order before it started.', '/admin', $order->id);

        return back()->with('success', "Order {$tag} cancelled.");
    }

    // Returns the disk that actually holds this photo, or null if the file is gone.
    private function photoDisk(string $path): ?string
    {
        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                return $disk;
            }
        }

        return null;
    }
}
