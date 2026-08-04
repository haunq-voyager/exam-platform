<?php

namespace App\Data\Exams;

use Spatie\LaravelData\Data;

class CreateExamDto extends Data
{
    public function __construct(
        public string $title,
        public ?string $description,
        public int $duration_minutes,
        public bool $shuffle_questions = true,
        public bool $shuffle_options = true,
    ) {}

    public static function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_minutes' => ['required', 'integer', 'min:1'],
            'shuffle_questions' => ['boolean'],
            'shuffle_options' => ['boolean'],
        ];
    }
}
