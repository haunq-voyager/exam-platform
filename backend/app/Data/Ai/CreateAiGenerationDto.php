<?php

namespace App\Data\Ai;

use App\Enums\Difficulty;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class CreateAiGenerationDto extends Data
{
    public function __construct(
        public ?int $subject_id,
        public ?int $topic_id,
        public string $prompt,
        public int $question_count = 5,
        public ?Difficulty $difficulty = null,
    ) {}

    public static function rules(): array
    {
        return [
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'topic_id' => ['nullable', 'integer', 'exists:topics,id'],
            'prompt' => ['required', 'string'],
            'question_count' => ['integer', 'min:1', 'max:10'],
            'difficulty' => ['nullable', Rule::enum(Difficulty::class)],
        ];
    }
}
