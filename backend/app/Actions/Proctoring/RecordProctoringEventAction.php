<?php

namespace App\Actions\Proctoring;

use App\Actions\Attempts\CancelExamAttemptForCheatingAction;
use App\Data\Proctoring\RecordProctoringEventDto;
use App\Enums\ExamAttemptStatus;
use App\Enums\ProctoringSeverity;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ProctoringEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RecordProctoringEventAction
{
    private const RISK_WEIGHT_BY_SEVERITY = [
        'low' => 5,
        'medium' => 15,
        'high' => 30,
    ];

    public function __construct(
        private CancelExamAttemptForCheatingAction $cancelExamAttemptForCheatingAction,
    ) {}

    /**
     * Every recorded event counts as one violation and flags the attempt for good.
     * Once violations exceed the session's `max_violations` the attempt is cancelled with score 0.
     *
     * @return array{event: ProctoringEvent, attempt: ExamAttempt}
     */
    public function execute(ExamAttempt $attempt, RecordProctoringEventDto $dto, User $student): array
    {
        if ($attempt->student_id !== $student->id) {
            throw new ApiException('You do not have access to this attempt.', 'exam_attempt.forbidden', 403);
        }

        return DB::transaction(function () use ($attempt, $dto) {
            /** @var ExamAttempt $locked */
            $locked = ExamAttempt::query()->with('session')->lockForUpdate()->findOrFail($attempt->id);

            if ($locked->status !== ExamAttemptStatus::InProgress) {
                throw new ApiException('This attempt is no longer in progress.', 'exam_attempt.not_in_progress', 422);
            }

            if (! $locked->session->proctoring_enabled) {
                throw new ApiException('Proctoring is not enabled for this exam session.', 'exam_attempt.proctoring_disabled', 422);
            }

            $proctoringSession = $locked->proctoringSession()->firstOrCreate([], [
                'camera_enabled' => true,
                'started_at' => now(),
            ]);

            $event = $proctoringSession->events()->create([
                'event_type' => $dto->event_type,
                'severity' => $dto->severity,
                'occurred_at' => $dto->occurred_at ?? now(),
                'metadata' => $dto->metadata,
            ]);

            $weight = self::RISK_WEIGHT_BY_SEVERITY[$dto->severity instanceof ProctoringSeverity ? $dto->severity->value : $dto->severity] ?? 0;
            $proctoringSession->update(['risk_score' => min(100, $proctoringSession->risk_score + $weight)]);

            $locked->update([
                'violation_count' => $locked->violation_count + 1,
                'is_flagged' => true,
            ]);

            if ($locked->violation_count > $locked->session->max_violations) {
                $proctoringSession->update(['ended_at' => now()]);
                $locked = $this->cancelExamAttemptForCheatingAction->execute($locked);
            }

            return ['event' => $event, 'attempt' => $locked];
        });
    }
}
