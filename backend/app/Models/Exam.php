<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property int $created_by
 * @property int $duration_minutes
 * @property bool $shuffle_questions
 * @property bool $shuffle_options
 * @property-read User $creator
 */
#[Fillable([
    'title',
    'description',
    'created_by',
    'duration_minutes',
    'shuffle_questions',
    'shuffle_options',
])]
class Exam extends Model
{
    protected function casts(): array
    {
        return [
            'shuffle_questions' => 'boolean',
            'shuffle_options' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'exam_questions')
            ->withPivot(['order', 'points'])
            ->orderByPivot('order');
    }

    public function examQuestions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ExamSession::class);
    }
}
