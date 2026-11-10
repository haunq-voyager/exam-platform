<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamSession */
class ExamSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $approvals = app(\App\Services\Approvals\ApprovalService::class);
        $user = $request->user();
        $level = $approvals->levelFor($this->resource);

        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'department_id' => $this->department_id,
            'department_name' => $this->whenLoaded('department', fn () => $this->department?->name),
            'approval' => [
                'required' => $approvals->isRequired(),
                'status' => $this->approval_status,
                'level_name' => $level?->name,
                'level_position' => $level?->position,
                'submitted_at' => $this->approval_submitted_at?->toISOString(),
                'approved_at' => $this->approved_at?->toISOString(),
                'can_act' => $user !== null && $approvals->canAct($user, $this->resource),
            ],
            // Stored state: draft (never switched on), open (switched on), closed (switched off / finished).
            'status' => $this->status,
            // What students experience: open becomes scheduled before start_at and closed after end_at.
            'effective_status' => $this->effectiveStatus(),
            'is_enabled' => $this->status === \App\Enums\ExamStatus::Open,
            'start_at' => $this->start_at?->toISOString(),
            'end_at' => $this->end_at?->toISOString(),
            'max_attempts' => $this->max_attempts,
            'scoring_method' => $this->scoring_method,
            'proctoring_enabled' => $this->proctoring_enabled,
            'max_violations' => $this->max_violations,
            'created_by' => $this->created_by,
            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'exam_id' => $this->exam_id,
            'exam_title' => $this->whenLoaded('exam', fn () => $this->exam?->title),
            'duration_minutes' => $this->whenLoaded('exam', fn () => $this->exam?->duration_minutes),
            'exam_is_shared' => $this->whenLoaded('exam', fn () => $this->exam?->is_template),
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
