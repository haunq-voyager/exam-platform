<?php

namespace App\Http\Resources;

use App\Enums\ExamAttemptStatus;
use App\Enums\ExamStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamSession */
class StudentExamSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $attempts = $this->relationLoaded('attempts') ? $this->attempts->sortBy('attempt_number')->values() : collect();
        $inProgress = $attempts->firstWhere('status', ExamAttemptStatus::InProgress);
        $currentAttempt = $inProgress ?? $attempts->last();
        $finalScore = $this->scoring_method->aggregate($attempts->where('status', ExamAttemptStatus::Graded));

        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'exam_title' => $this->whenLoaded('exam', fn () => $this->exam?->title),
            'description' => $this->whenLoaded('exam', fn () => $this->exam?->description),
            'duration_minutes' => $this->whenLoaded('exam', fn () => $this->exam?->duration_minutes),
            'status' => $this->effectiveStatus(),
            'start_at' => $this->start_at?->toISOString(),
            'end_at' => $this->end_at?->toISOString(),
            'question_count' => $this->whenLoaded('exam', fn () => $this->exam?->exam_questions_count),
            'max_attempts' => $this->max_attempts,
            'scoring_method' => $this->scoring_method,
            'proctoring_enabled' => $this->proctoring_enabled,
            'max_violations' => $this->max_violations,
            'my_attempt_id' => $currentAttempt?->id,
            'my_attempt_status' => $currentAttempt?->status,
            'my_attempt_count' => $attempts->count(),
            'my_score' => $finalScore,
            'my_flagged' => $attempts->contains(fn ($attempt) => $attempt->is_flagged),
            'can_attempt' => $this->effectiveStatus() === ExamStatus::Open
                && ($inProgress !== null || $attempts->count() < $this->max_attempts),
        ];
    }
}
