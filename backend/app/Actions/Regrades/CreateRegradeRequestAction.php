<?php

namespace App\Actions\Regrades;

use App\Data\Regrades\CreateRegradeRequestDto;
use App\Enums\ExamAttemptStatus;
use App\Enums\RegradeRequestStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\RegradeRequest;
use App\Models\User;

class CreateRegradeRequestAction
{
    public function execute(CreateRegradeRequestDto $dto, User $student): RegradeRequest
    {
        $attempt = ExamAttempt::query()->findOrFail($dto->exam_attempt_id);

        if ($attempt->student_id !== $student->id) {
            throw new ApiException('You do not have access to this attempt.', 'regrade_request.forbidden', 403);
        }

        if ($attempt->status !== ExamAttemptStatus::Graded) {
            throw new ApiException('This attempt has not been graded yet.', 'regrade_request.not_graded', 422);
        }

        return RegradeRequest::create([
            'exam_attempt_id' => $attempt->id,
            'student_id' => $student->id,
            'reason' => $dto->reason,
            'status' => RegradeRequestStatus::Pending,
            'old_score' => $attempt->score,
        ]);
    }
}
