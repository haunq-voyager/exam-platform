<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $attempt_id
 * @property int $question_id
 * @property array|null $selected_answer
 * @property bool|null $is_correct
 * @property float|null $points_earned
 * @property \Illuminate\Support\Carbon|null $autosaved_at
 * @property-read Question $question
 */
#[Fillable(['attempt_id', 'question_id', 'selected_answer', 'is_correct', 'points_earned', 'autosaved_at'])]
class ExamAttemptAnswer extends Model
{
    protected function casts(): array
    {
        return [
            'selected_answer' => 'array',
            'is_correct' => 'boolean',
            'points_earned' => 'decimal:2',
            'autosaved_at' => 'datetime',
        ];
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'attempt_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
