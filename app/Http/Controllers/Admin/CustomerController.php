<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Customers', [
            'customers' => User::where('role', 'customer')->withCount('orders')->latest()->get(),
        ]);
    }
}