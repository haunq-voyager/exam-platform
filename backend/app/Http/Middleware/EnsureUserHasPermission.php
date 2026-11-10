<?php

namespace App\Http\Middleware;

use App\Services\Auth\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** `permission:a,b` lets the request through when the user has at least one of the listed permissions. */
class EnsureUserHasPermission
{
    public function __construct(
        private PermissionService $permissions,
    ) {}

    public function handle(Request $request, Closure $next, string ...$required): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.', 'message_code' => 'auth.unauthenticated'], Response::HTTP_UNAUTHORIZED);
        }

        foreach ($required as $permission) {
            if ($this->permissions->has($user, $permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'You do not have permission to perform this action.',
            'message_code' => 'auth.forbidden',
        ], Response::HTTP_FORBIDDEN);
    }
}
