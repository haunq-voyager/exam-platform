<?php

namespace App\Models;

use App\Enums\ExamAttemptStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $exam_session_id
 * @property int $student_id
 * @property ExamAttemptStatus $status
 * @property \Illuminate\Support\Carbon $started_at
 * @property \Illuminate\Support\Carbon|null $submitted_at
 * @property float|null $score
 * @property float|null $total_points
 * @property int $attempt_number
 * @property int $violation_count
 * @property bool $is_flagged
 * @property string|null $cancel_reason
 * @property-read ExamSession $session
 * @property-read User $student
 */
#[Fillable([
    'exam_session_id',
    'student_id',
    'status',
    'started_at',
    'submitted_at',
    'score',
    'total_points',
    'attempt_number',
    'violation_count',
    'is_flagged',
    'cancel_reason',
    'cancel_note',
    'cancelled_by',
])]
class ExamAttempt extends Model
{
    protected function casts(): array
    {
        return [
            'status' => ExamAttemptStatus::class,
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
            'score' => 'decimal:2',
            'total_points' => 'decimal:2',
            'is_flagged' => 'boolean',
        ];
    }

    /** The attempt ends when the exam duration runs out or the session closes, whichever comes first. */
    public function deadline(): \Illuminate\Support\Carbon
    {
        $byDuration = $this->started_at->copy()->addMinutes($this->session->exam->duration_minutes);
        $sessionEnd = $this->session->end_at;

        return $sessionEnd !== null && $sessionEnd->lessThan($byDuration) ? $sessionEnd->copy() : $byDuration;
    }

    public function isCancelled(): bool
    {
        return $this->cancel_reason !== null;
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'exam_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ExamAttemptAnswer::class, 'attempt_id');
    }

    public function proctoringSession(): HasOne
    {
        return $this->hasOne(ProctoringSession::class, 'attempt_id');
    }
}
