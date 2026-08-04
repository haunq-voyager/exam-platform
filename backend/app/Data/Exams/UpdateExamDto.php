<?php

namespace App\Data\Exams;

use Spatie\LaravelData\Data;

class UpdateExamDto extends Data
{
    public function __construct(
        public ?string $title = null,
        public ?string $description = null,
        public ?int $duration_minutes = null,
        public ?bool $shuffle_questions = null,
        public ?bool $shuffle_options = null,
    ) {}

    public static function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'duration_minutes' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'shuffle_questions' => ['sometimes', 'nullable', 'boolean'],
            'shuffle_options' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
