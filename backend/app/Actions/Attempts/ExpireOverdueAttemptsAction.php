<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Models\ExamAttempt;

/**
 * There is no background worker, so attempts whose deadline has passed (student closed the tab, session ended)
 * are graded lazily the next time anything reads them.
 */
class ExpireOverdueAttemptsAction
{
    /** Extra seconds after the deadline during which a late submit from the browser is still accepted. */
    public const GRACE_SECONDS = 20;

    public function __construct(
        private SubmitExamAttemptAction $submitExamAttemptAction,
    ) {}

    public function execute(?int $studentId = null, ?int $sessionId = null): int
    {
        $query = ExamAttempt::query()
            ->where('status', ExamAttemptStatus::InProgress)
            ->with('session.exam');

        if ($studentId !== null) {
            $query->where('student_id', $studentId);
        }

        if ($sessionId !== null) {
            $query->where('exam_session_id', $sessionId);
        }

        $expired = 0;
        foreach ($query->get() as $attempt) {
            if ($this->isOverdue($attempt)) {
                $this->submitExamAttemptAction->executeSystem($attempt, $attempt->deadline());
                $expired++;
            }
        }

        return $expired;
    }

    public function isOverdue(ExamAttempt $attempt): bool
    {
        return $attempt->status === ExamAttemptStatus::InProgress
            && now()->greaterThan($attempt->deadline()->addSeconds(self::GRACE_SECONDS));
    }
}
