<?php

namespace App\Data\QuestionBank;

use App\Enums\Difficulty;
use App\Enums\QuestionType;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class UpdateQuestionDto extends Data
{
    public function __construct(
        public ?int $topic_id = null,
        public ?string $question_text = null,
        public ?QuestionType $question_type = null,
        public ?array $options = null,
        public ?array $correct_answer = null,
        public ?string $explanation = null,
        public ?Difficulty $difficulty = null,
    ) {}

    public static function rules(): array
    {
        return [
            'topic_id' => ['sometimes', 'nullable', 'integer', 'exists:topics,id'],
            'question_text' => ['sometimes', 'nullable', 'string'],
            'question_type' => ['sometimes', 'nullable', Rule::enum(QuestionType::class)],
            'options' => ['sometimes', 'nullable', 'array', 'min:2'],
            'correct_answer' => ['sometimes', 'nullable', 'array', 'min:1'],
            'explanation' => ['sometimes', 'nullable', 'string'],
            'difficulty' => ['sometimes', 'nullable', Rule::enum(Difficulty::class)],
        ];
    }
}
