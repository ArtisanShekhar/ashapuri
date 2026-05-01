<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class LoginPageController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Login');
    }
}
