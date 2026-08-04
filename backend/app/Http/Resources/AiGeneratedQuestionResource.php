<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\AiGeneratedQuestion */
class AiGeneratedQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_text' => $this->question_text,
            'question_type' => $this->question_type,
            'options' => $this->options,
            'correct_answer' => $this->correct_answer,
            'explanation' => $this->explanation,
            'difficulty' => $this->difficulty,
            'status' => $this->status,
            'approved_question_id' => $this->approved_question_id,
        ];
    }
}
