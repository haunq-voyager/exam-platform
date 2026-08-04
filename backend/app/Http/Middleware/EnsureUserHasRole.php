<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'message_code' => 'auth.unauthenticated',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $allowedRoles = array_map(static fn (string $role): UserRole => UserRole::from($role), $roles);

        if (! in_array($user->role, $allowedRoles, true)) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'message_code' => 'auth.forbidden',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
