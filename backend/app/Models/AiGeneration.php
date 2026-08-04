<?php

namespace App\Models;

use App\Enums\AiGenerationStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $teacher_id
 * @property int|null $subject_id
 * @property int|null $topic_id
 * @property string $prompt
 * @property string $model
 * @property int $question_count
 * @property string|null $difficulty
 * @property AiGenerationStatus $status
 * @property array|null $raw_response
 * @property-read User $teacher
 * @property-read Subject|null $subject
 * @property-read Topic|null $topic
 */
#[Fillable(['teacher_id', 'subject_id', 'topic_id', 'prompt', 'model', 'question_count', 'difficulty', 'status', 'raw_response'])]
class AiGeneration extends Model
{
    protected function casts(): array
    {
        return [
            'status' => AiGenerationStatus::class,
            'raw_response' => 'array',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function generatedQuestions(): HasMany
    {
        return $this->hasMany(AiGeneratedQuestion::class, 'generation_id');
    }
}
