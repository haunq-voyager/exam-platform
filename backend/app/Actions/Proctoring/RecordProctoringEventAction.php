<?php

namespace App\Actions\Proctoring;

use App\Data\Proctoring\RecordProctoringEventDto;
use App\Enums\ProctoringSeverity;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ProctoringEvent;
use App\Models\User;

class RecordProctoringEventAction
{
    private const RISK_WEIGHT_BY_SEVERITY = [
        'low' => 5,
        'medium' => 15,
        'high' => 30,
    ];

    public function execute(ExamAttempt $attempt, RecordProctoringEventDto $dto, User $student): ProctoringEvent
    {
        if ($attempt->student_id !== $student->id) {
            throw new ApiException('You do not have access to this attempt.', 'exam_attempt.forbidden', 403);
        }

        $session = $attempt->proctoringSession()->firstOrCreate([], [
            'camera_enabled' => true,
            'started_at' => now(),
        ]);

        $event = $session->events()->create([
            'event_type' => $dto->event_type,
            'severity' => $dto->severity,
            'occurred_at' => $dto->occurred_at ?? now(),
            'metadata' => $dto->metadata,
        ]);

        $weight = self::RISK_WEIGHT_BY_SEVERITY[$dto->severity instanceof ProctoringSeverity ? $dto->severity->value : $dto->severity] ?? 0;
        $session->update(['risk_score' => min(100, $session->risk_score + $weight)]);

        return $event;
    }
}
