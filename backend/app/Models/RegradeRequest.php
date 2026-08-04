<?php

namespace App\Models;

use App\Enums\RegradeRequestStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $exam_attempt_id
 * @property int $student_id
 * @property string $reason
 * @property RegradeRequestStatus $status
 * @property float|null $old_score
 * @property float|null $new_score
 * @property int|null $reviewed_by
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property-read ExamAttempt $attempt
 * @property-read User $student
 * @property-read User|null $reviewer
 */
#[Fillable(['exam_attempt_id', 'student_id', 'reason', 'status', 'old_score', 'new_score', 'reviewed_by', 'reviewed_at'])]
class RegradeRequest extends Model
{
    protected function casts(): array
    {
        return [
            'status' => RegradeRequestStatus::class,
            'old_score' => 'decimal:2',
            'new_score' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
