<?php

namespace App\Http\Middleware;

use App\Models\ExamSession;
use App\Services\Approvals\SessionAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Routes with an {examSession} parameter: the user must be allowed to see that particular session. */
class EnsureSessionAccess
{
    public function __construct(
        private SessionAccess $access,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $session = $request->route('examSession');
        if (! $session instanceof ExamSession) {
            $session = ExamSession::query()->find($session);
        }

        // An unknown id falls through to the normal 404 from route binding.
        if ($session !== null && ! $this->access->canView($request->user(), $session)) {
            return response()->json([
                'message' => 'You do not have access to this exam session.',
                'message_code' => 'auth.forbidden',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
