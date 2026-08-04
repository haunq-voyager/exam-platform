<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamSessionAssignment */
class ExamSessionAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_id' => $this->student_id,
            'student_name' => $this->whenLoaded('student', fn () => $this->student?->name),
            'student_email' => $this->whenLoaded('student', fn () => $this->student?->email),
        ];
    }
}
