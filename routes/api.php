<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\KitchenController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('jwt.auth')->group(function (): void {
    Route::post('/store/purchases', [StoreController::class, 'store']);
    Route::get('/store/purchases', [StoreController::class, 'index']);
    Route::get('/store/vendor-analysis', [StoreController::class, 'vendorAnalysis']);
    Route::get('/store/price-alerts', [StoreController::class, 'priceAlerts']);

    Route::post('/kitchen/submissions', [KitchenController::class, 'store']);
    Route::get('/kitchen/submissions', [KitchenController::class, 'index']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/guests', [DashboardController::class, 'guests']);
    Route::get('/dashboard/waste', [DashboardController::class, 'waste']);
    Route::get('/dashboard/cost-per-cover', [DashboardController::class, 'costPerCover']);

    Route::post('/ai/chat', [AiController::class, 'chat']);
    Route::post('/ai/daily-summary', [AiController::class, 'dailySummary']);
    Route::get('/ai/insights', [AiController::class, 'insights']);
});
