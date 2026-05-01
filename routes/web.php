<?php

use App\Http\Controllers\DashboardPageController;
use App\Http\Controllers\LoginPageController;
use Illuminate\Support\Facades\Route;

Route::get('/', LoginPageController::class)->name('login');
Route::get('/dashboard', DashboardPageController::class)->name('dashboard');
