<?php

namespace App\Models;

use App\Enums\ExamStatus;
use App\Enums\ScoringMethod;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $exam_id
 * @property string|null $code
 * @property string $title
 * @property int $created_by
 * @property ExamStatus $status
 * @property \Illuminate\Support\Carbon|null $start_at
 * @property \Illuminate\Support\Carbon|null $end_at
 * @property int $max_attempts
 * @property ScoringMethod $scoring_method
 * @property bool $proctoring_enabled
 * @property int $max_violations
 * @property int|null $department_id
 * @property string $approval_status draft|pending|approved|rejected
 * @property int|null $approval_position position of the level the session is waiting at
 * @property \Illuminate\Support\Carbon|null $approval_submitted_at
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property-read Exam $exam
 * @property-read User $creator
 */
#[Fillable([
    'exam_id',
    'title',
    'created_by',
    'status',
    'start_at',
    'end_at',
    'max_attempts',
    'scoring_method',
    'proctoring_enabled',
    'max_violations',
    'department_id',
    'approval_status',
    'approval_position',
    'approval_submitted_at',
    'approved_at',
])]
class ExamSession extends Model
{
    protected static function booted(): void
    {
        // The code embeds the id, so it can only be filled in once the row exists.
        static::created(function (self $session) {
            if ($session->code === null) {
                $session->forceFill(['code' => self::makeCode($session)])->saveQuietly();
            }
        });
    }

    /** Human-friendly unique code, e.g. KT2611-0042 (year+month of creation, then the id). */
    public static function makeCode(self $session): string
    {
        return sprintf('KT%s-%04d', ($session->created_at ?? now())->format('ym'), $session->id);
    }

    protected function casts(): array
    {
        return [
            'status' => ExamStatus::class,
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'approval_submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'scoring_method' => ScoringMethod::class,
            'proctoring_enabled' => 'boolean',
        ];
    }

    /**
     * What students experience: a session that is switched on (`open`) is still "scheduled" before `start_at`
     * and automatically "closed" after `end_at`, without anyone having to flip the switch.
     */
    public function effectiveStatus(): ExamStatus
    {
        if ($this->status !== ExamStatus::Open) {
            return $this->status;
        }

        if ($this->end_at !== null && now()->greaterThan($this->end_at)) {
            return ExamStatus::Closed;
        }

        if ($this->start_at !== null && now()->lessThan($this->start_at)) {
            return ExamStatus::Scheduled;
        }

        return ExamStatus::Open;
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(ExamSessionApproval::class)->orderBy('created_at')->orderBy('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'exam_session_teachers', 'exam_session_id', 'teacher_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ExamSessionAssignment::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }
}
