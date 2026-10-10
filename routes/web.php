<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\HistoryController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AvatarController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SavedOrderController;
use App\Models\Service;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome', [
    'services' => Service::where('active', true)->get(),
]))->name('home');

Route::middleware('auth')->get('/dashboard', fn () => auth()->user()->role === 'admin' ? redirect('/admin') : redirect('/orders'))->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');
});

Route::middleware('auth')->get('/avatars/{user}', [AvatarController::class, 'show'])->name('avatars.show');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('/orders/create', [OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:10,1')->name('orders.store');
    Route::post('/saved-orders', [SavedOrderController::class, 'store'])->middleware('throttle:20,1')->name('saved-orders.store');
    Route::delete('/saved-orders/{savedOrder}', [SavedOrderController::class, 'destroy'])->middleware('throttle:60,1')->name('saved-orders.destroy');
    Route::get('/orders/{order}/pay', [PaymentController::class, 'show'])->name('orders.pay');
    Route::post('/orders/{order}/pay', [PaymentController::class, 'pay'])->middleware('throttle:10,1')->name('orders.pay.store');
    Route::get('/orders/{order}/photo', [OrderController::class, 'photo'])->name('orders.photo');
    Route::delete('/orders/{order}/photo', [OrderController::class, 'destroyPhoto'])->name('orders.photo.destroy');
});

Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->group(function () {
    Route::get('/', [AdminOrderController::class, 'index']);
    Route::patch('/orders/{order}', [AdminOrderController::class, 'update']);
    Route::patch('/orders/{order}/paid', [AdminOrderController::class, 'markPaid']);
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/users', [UserController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/services/{service}', [ServiceController::class, 'update']);
    Route::delete('/services/{service}', [ServiceController::class, 'destroy']);
    Route::get('/history', [HistoryController::class, 'index']);
    Route::get('/history/export', [HistoryController::class, 'export']);
    Route::get('/analytics', [AnalyticsController::class, 'index']); // redirects to the dashboard
    Route::get('/analytics/export', [AnalyticsController::class, 'export']);
});

require __DIR__.'/settings.php';
