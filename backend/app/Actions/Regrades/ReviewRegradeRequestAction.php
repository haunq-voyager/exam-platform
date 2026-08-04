<?php

namespace App\Actions\Regrades;

use App\Data\Regrades\ReviewRegradeRequestDto;
use App\Enums\RegradeRequestStatus;
use App\Models\RegradeRequest;
use App\Models\User;

class ReviewRegradeRequestAction
{
    public function execute(RegradeRequest $regradeRequest, ReviewRegradeRequestDto $dto, User $reviewer): RegradeRequest
    {
        $regradeRequest->update([
            'status' => $dto->status,
            'new_score' => $dto->new_score,
            'reviewed_by' => $reviewer->id,
            'reviewed_at' => now(),
        ]);

        if ($dto->status === RegradeRequestStatus::Approved && $dto->new_score !== null) {
            $regradeRequest->attempt()->update(['score' => $dto->new_score]);
        }

        return $regradeRequest->fresh(['student', 'reviewer', 'attempt']);
    }
}
