<?php

namespace App\Actions\Regrades;

use App\Data\Regrades\ReviewRegradeRequestDto;
use App\Enums\RegradeRequestStatus;
use App\Exceptions\ApiException;
use App\Models\RegradeRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReviewRegradeRequestAction
{
    public function execute(RegradeRequest $regradeRequest, ReviewRegradeRequestDto $dto, User $reviewer): RegradeRequest
    {
        if ($regradeRequest->status !== RegradeRequestStatus::Pending) {
            throw new ApiException('This regrade request has already been handled.', 'regrade_request.already_handled', 422);
        }

        $attempt = $regradeRequest->attempt()->first();

        if ($dto->status === RegradeRequestStatus::Approved && (float) $dto->new_score > (float) $attempt->total_points) {
            throw new ApiException('The new score cannot exceed the total points of the exam.', 'regrade_request.score_too_high', 422);
        }

        DB::transaction(function () use ($regradeRequest, $dto, $reviewer, $attempt) {
            $regradeRequest->update([
                'status' => $dto->status,
                'new_score' => $dto->status === RegradeRequestStatus::Approved ? $dto->new_score : null,
                'response' => filled($dto->response) ? trim($dto->response) : null,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);

            if ($dto->status === RegradeRequestStatus::Approved) {
                $attempt->update(['score' => $dto->new_score]);
            }
        });

        return $regradeRequest->fresh(['student', 'reviewer', 'attempt.session']);
    }
}
