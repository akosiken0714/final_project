<?php

use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\OrderController;
use App\Models\Service;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome', [
    'services' => Service::where('active', true)->get(),
]))->name('home');

Route::middleware('auth')->get('/dashboard', fn () => auth()->user()->role === 'admin' ? redirect('/admin') : redirect('/orders'))->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/create', [OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1')->name('orders.store');
    Route::get('/orders/{order}/photo', [OrderController::class, 'photo'])->name('orders.photo');
    Route::delete('/orders/{order}/photo', [OrderController::class, 'destroyPhoto'])->name('orders.photo.destroy');
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->group(function () {
    Route::get('/', [AdminOrderController::class, 'index']);
    Route::patch('/orders/{order}', [AdminOrderController::class, 'update']);
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/services/{service}', [ServiceController::class, 'update']);
    Route::delete('/services/{service}', [ServiceController::class, 'destroy']);
});

require __DIR__.'/settings.php';