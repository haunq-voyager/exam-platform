<?php

namespace App\Models;

use App\Enums\ProctoringEventType;
use App\Enums\ProctoringSeverity;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $session_id
 * @property ProctoringEventType $event_type
 * @property ProctoringSeverity $severity
 * @property \Illuminate\Support\Carbon $occurred_at
 * @property array|null $metadata
 * @property-read ProctoringSession $session
 */
#[Fillable(['session_id', 'event_type', 'severity', 'occurred_at', 'metadata'])]
class ProctoringEvent extends Model
{
    protected function casts(): array
    {
        return [
            'event_type' => ProctoringEventType::class,
            'severity' => ProctoringSeverity::class,
            'occurred_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ProctoringSession::class, 'session_id');
    }
}
