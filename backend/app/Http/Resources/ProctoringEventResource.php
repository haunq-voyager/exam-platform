<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ProctoringEvent */
class ProctoringEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'session_id' => $this->session_id,
            'event_type' => $this->event_type,
            'severity' => $this->severity,
            'occurred_at' => $this->occurred_at?->toISOString(),
            'metadata' => $this->metadata,
        ];
    }
}
