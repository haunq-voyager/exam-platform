<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamQuestion */
class ExamQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_id' => $this->question_id,
            'order' => $this->order,
            'points' => $this->points,
            'question' => QuestionResource::make($this->whenLoaded('question')),
        ];
    }
}
