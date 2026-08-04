<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $exam_id
 * @property int $question_id
 * @property int $order
 * @property float $points
 */
#[Fillable(['exam_id', 'question_id', 'order', 'points'])]
class ExamQuestion extends Model
{
    protected function casts(): array
    {
        return [
            'points' => 'decimal:2',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
