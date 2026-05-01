<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;

class JwtAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['message' => 'Token missing'], 401);
        }

        try {
            $decoded = JWT::decode($token, new Key((string) config('app.key'), 'HS256'));
            $user = User::find($decoded->sub ?? null);
            if (! $user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            $request->setUserResolver(fn () => $user);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        return $next($request);
    }
}
