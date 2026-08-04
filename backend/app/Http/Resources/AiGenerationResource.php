<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\AiGeneration */
class AiGenerationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'teacher_id' => $this->teacher_id,
            'subject_id' => $this->subject_id,
            'topic_id' => $this->topic_id,
            'prompt' => $this->prompt,
            'model' => $this->model,
            'question_count' => $this->question_count,
            'difficulty' => $this->difficulty,
            'status' => $this->status,
            'generated_questions' => AiGeneratedQuestionResource::collection($this->whenLoaded('generatedQuestions')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
