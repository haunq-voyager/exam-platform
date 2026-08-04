<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamSession */
class ExamSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'status' => $this->status,
            'start_at' => $this->start_at?->toISOString(),
            'end_at' => $this->end_at?->toISOString(),
            'created_by' => $this->created_by,
            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'exam_id' => $this->exam_id,
            'exam_title' => $this->whenLoaded('exam', fn () => $this->exam?->title),
            'question_count' => $this->whenLoaded('exam', fn () => $this->exam?->exam_questions_count),
            'teachers' => $this->whenLoaded('teachers', fn () => $this->teachers->map(fn ($teacher) => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
            ])),
            'assigned_student_count' => $this->whenCounted('assignments'),
            'attempt_count' => $this->whenCounted('attempts'),
            'assignments' => ExamSessionAssignmentResource::collection($this->whenLoaded('assignments')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
