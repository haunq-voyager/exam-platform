<?php

namespace App\Models;

use App\Enums\AiGeneratedQuestionStatus;
use App\Enums\Difficulty;
use App\Enums\QuestionType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $generation_id
 * @property string $question_text
 * @property QuestionType $question_type
 * @property array $options
 * @property array $correct_answer
 * @property string|null $explanation
 * @property Difficulty $difficulty
 * @property AiGeneratedQuestionStatus $status
 * @property int|null $approved_question_id
 * @property-read AiGeneration $generation
 * @property-read Question|null $approvedQuestion
 */
#[Fillable(['generation_id', 'question_text', 'question_type', 'options', 'correct_answer', 'explanation', 'difficulty', 'status', 'approved_question_id'])]
class AiGeneratedQuestion extends Model
{
    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answer' => 'array',
            'question_type' => QuestionType::class,
            'difficulty' => Difficulty::class,
            'status' => AiGeneratedQuestionStatus::class,
        ];
    }

    public function generation(): BelongsTo
    {
        return $this->belongsTo(AiGeneration::class, 'generation_id');
    }

    public function approvedQuestion(): BelongsTo
    {
        return $this->belongsTo(Question::class, 'approved_question_id');
    }
}
