<?php

namespace App\Actions\Attempts;

use App\Enums\UserRole;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\User;

class ShowExamAttemptAction
{
    public function execute(ExamAttempt $attempt, User $viewer): ExamAttempt
    {
        $isOwner = $attempt->student_id === $viewer->id;
        $isStaff = in_array($viewer->role, [UserRole::Admin, UserRole::Teacher], true);

        if (! $isOwner && ! $isStaff) {
            throw new ApiException('You do not have access to this attempt.', 'exam_attempt.forbidden', 403);
        }

        return $attempt->load([
            'session.exam.examQuestions.question',
            'student',
            'answers',
        ]);
    }
}
