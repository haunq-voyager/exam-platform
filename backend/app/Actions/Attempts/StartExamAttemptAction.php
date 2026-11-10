<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Enums\ExamStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StartExamAttemptAction
{
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
    ) {}

    public function execute(ExamSession $session, User $student): ExamAttempt
    {
        $isAssigned = $session->assignments()->where('student_id', $student->id)->exists();
        if (! $isAssigned) {
            throw new ApiException('You are not assigned to this exam session.', 'exam_attempt.not_assigned', 403);
        }

        // An abandoned attempt past its deadline must be finished (and counted) before deciding what is allowed.
        $this->expireOverdueAttemptsAction->execute($student->id, $session->id);

        $this->assertOpenForAttempts($session);

        return DB::transaction(function () use ($session, $student) {
            // Serialise concurrent "start" requests of the same session so max_attempts cannot be exceeded.
            ExamSession::query()->whereKey($session->id)->lockForUpdate()->first();

            $attempts = ExamAttempt::query()
                ->where('exam_session_id', $session->id)
                ->where('student_id', $student->id)
                ->get();

            $inProgress = $attempts->firstWhere('status', ExamAttemptStatus::InProgress);
            if ($inProgress !== null) {
                return $inProgress;
            }

            if ($attempts->count() >= $session->max_attempts) {
                throw new ApiException('You have used all attempts for this exam session.', 'exam_attempt.max_attempts_reached', 422);
            }

            return ExamAttempt::create([
                'exam_session_id' => $session->id,
                'student_id' => $student->id,
                'status' => ExamAttemptStatus::InProgress,
                'started_at' => now(),
                'attempt_number' => $attempts->count() + 1,
            ]);
        });
    }

    private function assertOpenForAttempts(ExamSession $session): void
    {
        $effective = $session->effectiveStatus();

        if ($effective === ExamStatus::Open) {
            return;
        }

        if ($effective === ExamStatus::Scheduled) {
            throw new ApiException('The exam session has not started yet.', 'exam_attempt.not_started', 422);
        }

        // Switched on but past its end date, versus switched off by the teacher.
        if ($session->status === ExamStatus::Open) {
            throw new ApiException('The exam session has ended.', 'exam_attempt.ended', 422);
        }

        throw new ApiException('Exam session is not open for attempts.', 'exam_attempt.not_open', 422);
    }
}
