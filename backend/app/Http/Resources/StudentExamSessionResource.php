<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamSession */
class StudentExamSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $myAttempt = $this->whenLoaded('attempts', fn () => $this->attempts->first());

        return [
            'id' => $this->id,
            'title' => $this->title,
            'exam_title' => $this->whenLoaded('exam', fn () => $this->exam?->title),
            'description' => $this->whenLoaded('exam', fn () => $this->exam?->description),
            'duration_minutes' => $this->whenLoaded('exam', fn () => $this->exam?->duration_minutes),
            'status' => $this->status,
            'start_at' => $this->start_at?->toISOString(),
            'end_at' => $this->end_at?->toISOString(),
            'question_count' => $this->whenLoaded('exam', fn () => $this->exam?->exam_questions_count),
            'my_attempt_id' => $myAttempt?->id,
            'my_attempt_status' => $myAttempt?->status,
            'my_score' => $myAttempt?->score,
        ];
    }
}
