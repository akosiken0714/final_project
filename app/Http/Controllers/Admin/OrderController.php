<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index()
    {
        $orders = Order::with(['user', 'service'])->latest()->get();

        return Inertia::render('Admin/Orders', [
            'orders' => $orders,
            'statuses' => Order::STATUSES,
            'stats' => [
                'total' => $orders->count(),
                'pending' => $orders->where('status', 'Pending')->count(),
                'ready' => $orders->where('status', 'Ready for Pickup')->count(),
                'revenue' => $orders->where('status', 'Completed')->sum('total'),
            ],
        ]);
    }

    public function update(UpdateOrderStatusRequest $request, Order $order)
    {
        $to = $request->validated()['status'];
        $from = $order->status;

        if ($from === $to) {
            return back();
        }

        if ($from === 'Completed') {
            return back()->withErrors(['status' => "Completed orders can't be reopened."]);
        }

        $order->update(['status' => $to]);

        DB::table('order_status_logs')->insert([
            'order_id' => $order->id,
            'changed_by' => $request->user()->id,
            'from_status' => $from,
            'to_status' => $to,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back()->with('success', 'Order #' . str_pad($order->id, 4, '0', STR_PAD_LEFT) . " is now {$to}.");
    }
}