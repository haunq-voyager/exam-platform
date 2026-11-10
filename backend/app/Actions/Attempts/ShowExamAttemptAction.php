<?php

namespace App\Actions\Attempts;

use App\Enums\Permission;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\User;
use App\Services\Approvals\SessionAccess;

class ShowExamAttemptAction
{
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
        private SubmitExamAttemptAction $submitExamAttemptAction,
        private SessionAccess $sessionAccess,
    ) {}

    public function execute(ExamAttempt $attempt, User $viewer): ExamAttempt
    {
        $isOwner = $attempt->student_id === $viewer->id;
        $attempt->loadMissing('session.exam');

        // Staff need the results permission AND responsibility for that session (a teacher: only assigned ones).
        $isStaff = $viewer->hasPermission(Permission::ResultsView) && $this->sessionAccess->canView($viewer, $attempt->session);

        if (! $isOwner && ! $isStaff) {
            throw new ApiException('You do not have access to this attempt.', 'exam_attempt.forbidden', 403);
        }

        if ($this->expireOverdueAttemptsAction->isOverdue($attempt)) {
            $this->submitExamAttemptAction->executeSystem($attempt, $attempt->deadline());
        }

        return $attempt->load([
            'session.exam.examQuestions.question',
            'student',
            'answers',
        ]);
    }
}
