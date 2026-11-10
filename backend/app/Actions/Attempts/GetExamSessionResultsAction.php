<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Models\ExamSession;

class GetExamSessionResultsAction
{
    /**
     * One row per assigned student with the final score computed by the session's scoring method.
     *
     * @return array<int, array<string, mixed>>
     */
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
    ) {}

    public function execute(ExamSession $session): array
    {
        $this->expireOverdueAttemptsAction->execute(sessionId: $session->id);

        $attemptsByStudent = $session->attempts()->get()->groupBy('student_id');

        return $session->assignments()
            ->with('student')
            ->get()
            ->map(function ($assignment) use ($session, $attemptsByStudent) {
                $attempts = $attemptsByStudent->get($assignment->student_id, collect());
                $graded = $attempts->where('status', ExamAttemptStatus::Graded);

                return [
                    'student_id' => $assignment->student_id,
                    'student_name' => $assignment->student?->name,
                    'student_email' => $assignment->student?->email,
                    'attempts_used' => $attempts->count(),
                    'final_score' => $session->scoring_method->aggregate($graded),
                    'total_points' => $graded->first()?->total_points,
                    'is_flagged' => $attempts->contains(fn ($attempt) => $attempt->is_flagged),
                    'cancelled_count' => $attempts->filter(fn ($attempt) => $attempt->isCancelled())->count(),
                ];
            })
            ->values()
            ->all();
    }
}
