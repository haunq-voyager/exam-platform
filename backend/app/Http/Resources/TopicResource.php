<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Topic */
class TopicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject_id' => $this->subject_id,
            'subject_name' => $this->whenLoaded('subject', fn () => $this->subject->name),
            'name' => $this->name,
            'description' => $this->description,
            'image_path' => $this->image_path,
            'created_by' => $this->created_by,
            'creator_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'updated_by' => $this->updated_by,
            'updater_name' => $this->whenLoaded('updater', fn () => $this->updater?->name),
            'questions_count' => $this->whenCounted('questions'),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
