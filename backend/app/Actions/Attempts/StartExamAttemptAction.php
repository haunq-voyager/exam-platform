<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Enums\ExamStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Models\User;

class StartExamAttemptAction
{
    public function execute(ExamSession $session, User $student): ExamAttempt
    {
        $isAssigned = $session->assignments()->where('student_id', $student->id)->exists();
        if (! $isAssigned) {
            throw new ApiException('You are not assigned to this exam session.', 'exam_attempt.not_assigned', 403);
        }

        if ($session->status !== ExamStatus::Open) {
            throw new ApiException('Exam session is not open for attempts.', 'exam_attempt.not_open', 422);
        }

        $existingAttempt = ExamAttempt::query()
            ->where('exam_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existingAttempt !== null) {
            if ($existingAttempt->status === ExamAttemptStatus::InProgress) {
                return $existingAttempt;
            }

            throw new ApiException('You have already submitted this exam session.', 'exam_attempt.already_submitted', 422);
        }

        return ExamAttempt::create([
            'exam_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => ExamAttemptStatus::InProgress,
            'started_at' => now(),
        ]);
    }
}
