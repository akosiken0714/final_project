<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use App\Models\Service;
use App\Support\PhotoSanitizer;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Orders/Index', [
            'orders' => $request->user()->orders()->with('service')->latest()->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Orders/Create', [
            'services' => Service::where('active', true)->get(),
        ]);
    }

    public function store(StoreOrderRequest $request)
    {
        $service = Service::where('active', true)->findOrFail($request->service_id);

        $data = $request->safe()->only(['service_id', 'quantity', 'address', 'instructions']);
        $data['user_id'] = $request->user()->id;
        $data['total'] = $service->price * $request->quantity;

        if ($request->hasFile('photo')) {
            $data['photo'] = PhotoSanitizer::store($request->file('photo'));
        }

        Order::create($data);

        return redirect('/orders')->with('success', "Order placed! We'll update you as it moves along.");
    }

    // Photos are private: only the owner or an admin can view them.
    public function photo(Request $request, Order $order)
    {
        $user = $request->user();
        abort_unless($order->photo && ($user->isAdmin() || $order->user_id === $user->id), 404);

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

    public function destroyPhoto(Request $request, Order $order)
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