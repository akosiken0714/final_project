<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Support\Activity;
use App\Support\Intake;
use App\Support\PhotoSanitizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

// The intake record: staff count the items and note their condition when laundry is received at the counter.
// It settles "you lost my sock" disputes. The customer can see the count, the notes and the photo of their own order.
class OrderIntakeController extends Controller
{
    // Staff and admin (route middleware "shop"). Saving again simply updates the record, until the order is finished.
    public function store(Request $request, Order $order): RedirectResponse
    {
        $data = $request->validate([
            'item_count' => ['required', 'integer', 'min:1', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_photo' => ['nullable', 'boolean'],
        ], [
            'item_count.required' => 'Count the items and enter the number.',
            'item_count.integer' => 'Enter a whole number of items (1, 2, 3…).',
            'item_count.min' => 'There must be at least 1 item.',
            'item_count.max' => 'That is too many items for one order (500 is the most).',
            'notes.max' => 'Keep the notes under 500 characters.',
            'photo.mimes' => 'Photo must be a JPG, PNG or WebP.',
            'photo.max' => 'Photo must be 4 MB or smaller.',
        ]);

        if (in_array($order->status, [Order::CLAIMED, Order::CANCELLED], true)) {
            return back()->withErrors(['item_count' => "A {$order->status} order can't be changed."]);
        }

        // Cleans the photo (no hidden location data) and refuses files that are not real photos.
        $photo = $request->hasFile('photo') ? PhotoSanitizer::store($request->file('photo')) : null;

        $result = Intake::save(
            $order,
            $request->user(),
            (int) $data['item_count'],
            $data['notes'] ?? null,
            $photo,
            $request->boolean('remove_photo'),
        );

        $items = (int) $data['item_count'];
        $tag = Activity::tag($order->id);
        $label = Intake::itemsLabel($items);

        if ($result['created']) {
            Activity::log('order.intake', "Order {$tag} received at the counter: {$label}".($result['intake']->notes ? ' · '.$result['intake']->notes : ''), $order, $request->user()->id, ['items' => $items]);
            Activity::notifyUser($order->user, "We received your laundry ({$tag})", "{$label} received at the shop.".($result['intake']->notes ? ' Note: '.$result['intake']->notes : ''), '/orders', $order->id);
        } else {
            $before = Intake::itemsLabel((int) $result['oldCount']);
            Activity::log('order.intake', "Order {$tag} intake updated: {$before} → {$label}", $order, $request->user()->id, ['from' => $result['oldCount'], 'to' => $items]);

            // The customer is only told when the COUNT changed (a corrected note is not worth a message).
            if ((int) $result['oldCount'] !== $items) {
                Activity::notifyUser($order->user, "Item count updated ({$tag})", "We corrected the count: {$before} → {$label}.", '/orders', $order->id);
            }
        }

        return back()->with('success', "Order {$tag}: {$label} recorded.");
    }

    // Private: only the owner of the order or the shop team can see the counter photo.
    public function photo(Request $request, Order $order)
    {
        $user = $request->user();
        abort_unless($user->isShop() || $order->user_id === $user->id, 404);

        $intake = $order->intake;
        abort_unless($intake && $intake->photo, 404);

        $disk = $intake->photoDisk();
        abort_if($disk === null, 404);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $storage */
        $storage = Storage::disk($disk);

        return $storage->response($intake->photo, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
