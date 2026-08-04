<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class CreateExamSessionDto extends Data
{
    public function __construct(
        public string $title,
        public ?int $exam_id = null,
        public ?string $new_exam_title = null,
        public ?array $question_ids = null,
        public ?int $duration_minutes = null,
        public ?string $start_at = null,
        public ?string $end_at = null,
    ) {}

    public static function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'exam_id' => ['nullable', 'integer', 'exists:exams,id', 'required_without:question_ids'],
            'new_exam_title' => ['nullable', 'string', 'max:255'],
            'question_ids' => ['nullable', 'array', 'required_without:exam_id'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'required_with:question_ids'],
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date', 'after:start_at'],
        ];
    }
}
