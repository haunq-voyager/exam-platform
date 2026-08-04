<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $attempt_id
 * @property bool $camera_enabled
 * @property \Illuminate\Support\Carbon $started_at
 * @property \Illuminate\Support\Carbon|null $ended_at
 * @property int $risk_score
 * @property-read ExamAttempt $attempt
 */
#[Fillable(['attempt_id', 'camera_enabled', 'started_at', 'ended_at', 'risk_score'])]
class ProctoringSession extends Model
{
    protected function casts(): array
    {
        return [
            'camera_enabled' => 'boolean',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'attempt_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ProctoringEvent::class, 'session_id');
    }
}
