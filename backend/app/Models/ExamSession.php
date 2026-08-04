<?php

namespace App\Models;

use App\Enums\ExamStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $exam_id
 * @property string $title
 * @property int $created_by
 * @property ExamStatus $status
 * @property \Illuminate\Support\Carbon|null $start_at
 * @property \Illuminate\Support\Carbon|null $end_at
 * @property-read Exam $exam
 * @property-read User $creator
 */
#[Fillable(['exam_id', 'title', 'created_by', 'status', 'start_at', 'end_at'])]
class ExamSession extends Model
{
    protected function casts(): array
    {
        return [
            'status' => ExamStatus::class,
            'start_at' => 'datetime',
            'end_at' => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
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
