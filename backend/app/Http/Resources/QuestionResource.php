<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Question */
class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'topic_id' => $this->topic_id,
            'topic_name' => $this->whenLoaded('topic', fn () => $this->topic?->name),
            'created_by' => $this->created_by,
            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'updated_by' => $this->updated_by,
            'updater_name' => $this->whenLoaded('updater', fn () => $this->updater?->name),
            'question_text' => $this->question_text,
            'question_type' => $this->question_type,
            'options' => $this->options,
            'correct_answer' => $this->correct_answer,
            'explanation' => $this->explanation,
            'difficulty' => $this->difficulty,
            'status' => $this->status,
            'source' => $this->source,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
