<?php

namespace App\Data\QuestionBank;

use App\Enums\Difficulty;
use App\Enums\QuestionType;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class CreateQuestionDto extends Data
{
    public function __construct(
        public ?int $topic_id,
        public string $question_text,
        public QuestionType $question_type,
        public array $options,
        public array $correct_answer,
        public ?string $explanation,
        public Difficulty $difficulty,
    ) {}

    public static function rules(): array
    {
        return [
            'topic_id' => ['nullable', 'integer', 'exists:topics,id'],
            'question_text' => ['required', 'string'],
            'question_type' => ['required', Rule::enum(QuestionType::class)],
            'options' => ['required', 'array', 'min:2'],
            'options.*' => ['required', 'string'],
            'correct_answer' => ['required', 'array', 'min:1'],
            'explanation' => ['nullable', 'string'],
            'difficulty' => ['required', Rule::enum(Difficulty::class)],
        ];
    }
}
