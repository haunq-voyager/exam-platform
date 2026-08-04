<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamAttempt */
class ExamAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_session_id' => $this->exam_session_id,
            'exam_session_title' => $this->whenLoaded('session', fn () => $this->session?->title),
            'exam_title' => $this->whenLoaded('session', fn () => $this->session?->exam?->title),
            'student_id' => $this->student_id,
            'student_name' => $this->whenLoaded('student', fn () => $this->student?->name),
            'status' => $this->status,
            'started_at' => $this->started_at?->toISOString(),
            'submitted_at' => $this->submitted_at?->toISOString(),
            'score' => $this->score,
            'total_points' => $this->total_points,
        ];
    }
}
