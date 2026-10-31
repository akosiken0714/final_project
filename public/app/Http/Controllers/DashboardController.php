<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// Sends each person to their own home: admins and staff to /admin, customers to /orders.
class DashboardController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        return $request->user()->isShop() ? redirect('/admin') : redirect('/orders');
    }
}
