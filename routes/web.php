<?php

use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\HistoryController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WalkInController;
use App\Http\Controllers\AvatarController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderIntakeController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RatingController;
use App\Http\Controllers\SavedOrderController;
use App\Http\Controllers\UnverifiedEmailController;
use Illuminate\Support\Facades\Route;

// Rate limits: "throttle:N,1" = at most N requests per minute per logged-in user (per IP when logged out).
// Every route that changes data has one, so a stuck button, a bug or a bot cannot hammer the server.

Route::get('/', HomeController::class)->name('home');

// Public info pages: /privacy, /terms, /refund
Route::get('/{page}', [LegalController::class, 'show'])->whereIn('page', ['privacy', 'terms', 'refund'])->name('legal');

// Dashboard and Settings need a VERIFIED email. A brand-new account lands on the "check your email" page first.
Route::middleware(['auth', 'verified'])->get('/dashboard', DashboardController::class)->name('dashboard');

// An account that is not verified yet can fix a mistyped email here (the "Wrong email?" box on the verify page).
Route::middleware(['auth', 'throttle:6,1'])->post('/email/change', [UnverifiedEmailController::class, 'update'])->name('verification.change');

Route::middleware('auth')->group(function () {
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->middleware('throttle:30,1')->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->middleware('throttle:60,1')->name('notifications.read');
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
    Route::delete('/orders/{order}/photo', [OrderController::class, 'destroyPhoto'])->middleware('throttle:20,1')->name('orders.photo.destroy');
    Route::get('/orders/{order}/receipt', [OrderController::class, 'receipt'])->name('orders.receipt');
    // The counter photo from the intake record: only the order's owner or the shop team can open it.
    Route::get('/orders/{order}/intake-photo', [OrderIntakeController::class, 'photo'])->name('orders.intake-photo');
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel'])->middleware('throttle:10,1')->name('orders.cancel');
    Route::post('/orders/{order}/rating', [RatingController::class, 'store'])->middleware('throttle:20,1')->name('orders.rating.store');
});

// THE SHOP TEAM (staff + admin): the order desk. Staff are cashiers: they update statuses, weigh, record payment and
// intake, take walk-in orders, and cancel UNPAID orders. They do not see revenue/analytics (the dashboard hides them).
Route::middleware(['auth', 'verified', 'shop'])->prefix('admin')->group(function () {
    Route::get('/', [AdminOrderController::class, 'index']);
    Route::patch('/orders/{order}', [AdminOrderController::class, 'update'])->middleware('throttle:120,1');
    Route::patch('/orders/{order}/paid', [AdminOrderController::class, 'markPaid'])->middleware('throttle:120,1');
    Route::patch('/orders/{order}/weigh', [AdminOrderController::class, 'weigh'])->middleware('throttle:60,1');
    Route::post('/orders/{order}/cancel', [AdminOrderController::class, 'cancel'])->middleware('throttle:30,1');
    Route::post('/orders/{order}/intake', [OrderIntakeController::class, 'store'])->middleware('throttle:60,1');
    Route::get('/walk-in', [WalkInController::class, 'create']);
    Route::post('/walk-in', [WalkInController::class, 'store'])->middleware('throttle:30,1');
});

// ADMIN ONLY: money totals, accounts, prices, history and reports.
Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->group(function () {
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/users', [UserController::class, 'store'])->middleware('throttle:10,1');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('throttle:10,1');
    Route::post('/users/{user}/restore', [UserController::class, 'restore'])->withTrashed()->middleware('throttle:20,1');
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store'])->middleware('throttle:20,1');
    Route::patch('/services/{service}', [ServiceController::class, 'update'])->middleware('throttle:30,1');
    Route::delete('/services/{service}', [ServiceController::class, 'destroy'])->middleware('throttle:20,1');
    Route::get('/history', [HistoryController::class, 'index']);
    Route::get('/history/export', [HistoryController::class, 'export'])->middleware('throttle:10,1');
    Route::get('/analytics', [AnalyticsController::class, 'index']); // redirects to the dashboard
    Route::get('/analytics/export', [AnalyticsController::class, 'export'])->middleware('throttle:10,1');
    Route::get('/report', [ReportController::class, 'show'])->middleware('throttle:30,1');
});

// Every Settings page (profile, password, security, pickup spot...) is only for verified accounts.
Route::middleware(['auth', 'verified'])->group(function () {
    require __DIR__.'/settings.php';
});
