<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim($this->text($request, 'q'));

        $people = User::where('role', User::CUSTOMER)
            ->withCount('orders')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.str_replace(['%', '_'], '', $search).'%';
                $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like)->orWhere('phone', 'like', $like));
            })
            ->latest()
            ->paginate(24)
            ->withQueryString();

        return Inertia::render('Admin/Customers', [
            'customers' => $people,
            'search' => $search,
            'totals' => [
                'customers' => User::where('role', User::CUSTOMER)->count(),
            ],
        ]);
    }
}
