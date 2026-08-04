<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\RegradeRequest */
class RegradeRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'exam_attempt_id' => $this->exam_attempt_id,
            'exam_session_title' => $this->whenLoaded('attempt', fn () => $this->attempt?->session?->title),
            'student_id' => $this->student_id,
            'student_name' => $this->whenLoaded('student', fn () => $this->student?->name),
            'reason' => $this->reason,
            'status' => $this->status,
            'old_score' => $this->old_score,
            'new_score' => $this->new_score,
            'reviewed_by' => $this->reviewed_by,
            'reviewer_name' => $this->whenLoaded('reviewer', fn () => $this->reviewer?->name),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
