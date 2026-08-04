<?php

namespace App\Models;

use App\Enums\Difficulty;
use App\Enums\QuestionSource;
use App\Enums\QuestionStatus;
use App\Enums\QuestionType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int|null $topic_id
 * @property int $created_by
 * @property string $question_text
 * @property QuestionType $question_type
 * @property array $options
 * @property array $correct_answer
 * @property string|null $explanation
 * @property Difficulty $difficulty
 * @property QuestionStatus $status
 * @property QuestionSource $source
 * @property-read Topic|null $topic
 * @property-read User $creator
 */
#[Fillable([
    'topic_id',
    'created_by',
    'updated_by',
    'question_text',
    'question_type',
    'options',
    'correct_answer',
    'explanation',
    'difficulty',
    'status',
    'source',
])]
class Question extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answer' => 'array',
            'question_type' => QuestionType::class,
            'difficulty' => Difficulty::class,
            'status' => QuestionStatus::class,
            'source' => QuestionSource::class,
        ];
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
