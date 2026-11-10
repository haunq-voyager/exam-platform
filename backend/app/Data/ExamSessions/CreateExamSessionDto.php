<?php

namespace App\Data\ExamSessions;

use App\Enums\ScoringMethod;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class CreateExamSessionDto extends Data
{
    /**
     * Content is either an existing template (`exam_id`) or built right here (`question_ids`, possibly empty:
     * questions can be added later, a session without questions simply cannot be switched on yet).
     */
    public function __construct(
        public string $title,
        public ?int $exam_id = null,
        public ?string $new_exam_title = null,
        public ?array $question_ids = null,
        public ?int $duration_minutes = null,
        public ?string $start_at = null,
        public ?string $end_at = null,
        public int $max_attempts = 1,
        public ScoringMethod $scoring_method = ScoringMethod::Highest,
        public bool $proctoring_enabled = true,
        public ?int $department_id = null,
        public int $max_violations = 3,
    ) {}

    public static function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'exam_id' => ['nullable', 'integer', 'exists:exams,id'],
            'new_exam_title' => ['nullable', 'string', 'max:255'],
            'question_ids' => ['nullable', 'array', 'max:500'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date', 'after:start_at'],
            'max_attempts' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'scoring_method' => ['sometimes', Rule::enum(ScoringMethod::class)],
            'proctoring_enabled' => ['sometimes', 'boolean'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'max_violations' => ['sometimes', 'integer', 'min:0', 'max:20'],
        ];
    }
}
