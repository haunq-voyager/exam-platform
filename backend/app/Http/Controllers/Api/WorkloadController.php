<?php

namespace App\Http\Controllers\Api;

use App\Actions\Attempts\ExpireOverdueAttemptsAction;
use App\Enums\ExamAttemptStatus;
use App\Enums\ExamStatus;
use App\Enums\Permission;
use App\Enums\RegradeRequestStatus;
use App\Models\ExamAttempt;
use App\Models\ExamFeedback;
use App\Models\ExamSession;
use App\Models\RegradeRequest;
use App\Services\Approvals\SessionAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Numbers for the staff dashboard and menu badges: what needs attention right now. */
class WorkloadController extends BaseController
{
    public function __construct(
        private SessionAccess $sessionAccess,
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $visible = fn (Builder $sessions) => $this->sessionAccess->scopeVisible($sessions, $user);

        // Attempts past their deadline are finished first, otherwise abandoned attempts count as "in progress" forever.
        if ($user->hasPermission(Permission::SessionsProctor)) {
            $this->expireOverdueAttemptsAction->execute();
        }

        $running = $user->hasPermission(Permission::SessionsProctor)
            ? ExamSession::query()
                ->where('status', ExamStatus::Open)
                ->where(fn (Builder $query) => $query->whereNull('start_at')->orWhere('start_at', '<=', now()))
                ->where(fn (Builder $query) => $query->whereNull('end_at')->orWhere('end_at', '>=', now()))
                ->tap($visible)
                ->count()
            : 0;

        $inProgress = $user->hasPermission(Permission::SessionsProctor)
            ? ExamAttempt::query()->where('status', ExamAttemptStatus::InProgress)->whereHas('session', $visible)->count()
            : 0;

        $regrades = $user->hasPermission(Permission::RegradesReview)
            ? RegradeRequest::query()->where('status', RegradeRequestStatus::Pending)->whereHas('attempt.session', $visible)->count()
            : 0;

        $feedback = $user->hasPermission(Permission::FeedbackRespond)
            ? ExamFeedback::query()->whereNull('replied_at')->whereHas('session', $visible)->count()
            : 0;

        return $this->respondSuccess(data: [
            'running_sessions' => $running,
            'in_progress_attempts' => $inProgress,
            'pending_regrades' => $regrades,
            'unanswered_feedback' => $feedback,
        ], message: 'Workload retrieved successfully.');
    }
}
