<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;

class CancelExamAttemptForCheatingAction
{
    public const REASON = 'cheating';

    /**
     * Ends an in-progress attempt immediately: it is graded 0 and permanently flagged.
     */
    public function execute(ExamAttempt $attempt): ExamAttempt
    {
        if ($attempt->status !== ExamAttemptStatus::InProgress) {
            throw new ApiException('This attempt is no longer in progress.', 'exam_attempt.not_in_progress', 422);
        }

        $totalPoints = (float) $attempt->session->exam->examQuestions()->sum('points');

        $attempt->answers()->update(['is_correct' => false, 'points_earned' => 0]);

        $attempt->update([
            'status' => ExamAttemptStatus::Graded,
            'submitted_at' => now(),
            'score' => 0,
            'total_points' => $totalPoints,
            'is_flagged' => true,
            'cancel_reason' => self::REASON,
        ]);

        return $attempt->refresh();
    }
}
