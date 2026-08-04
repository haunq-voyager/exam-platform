<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Exam */
class ExamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'created_by' => $this->created_by,
            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'duration_minutes' => $this->duration_minutes,
            'shuffle_questions' => $this->shuffle_questions,
            'shuffle_options' => $this->shuffle_options,
            'question_count' => $this->whenCounted('examQuestions'),
            'questions' => ExamQuestionResource::collection($this->whenLoaded('examQuestions')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
