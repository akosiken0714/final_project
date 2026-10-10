<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('q', ''));

        $people = User::withCount('orders')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . str_replace(['%', '_'], '', $search) . '%';
                $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like));
            })
            ->orderByRaw("role = 'admin' desc")
            ->latest()
            ->get();

        return Inertia::render('Admin/Customers', [
            'customers' => $people,
            'search' => $search,
            'totals' => [
                'customers' => User::where('role', 'customer')->count(),
                'admins' => User::where('role', 'admin')->count(),
            ],
        ]);
    }
}
