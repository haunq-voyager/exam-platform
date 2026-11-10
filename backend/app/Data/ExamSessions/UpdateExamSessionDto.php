<?php

namespace App\Data\ExamSessions;

use App\Enums\ScoringMethod;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

class UpdateExamSessionDto extends Data
{
    /**
     * `start_at` / `end_at` use Optional so "not sent" (keep) and `null` (clear the date) can be told apart.
     */
    public function __construct(
        public ?string $title = null,
        public string|Optional|null $start_at = new Optional(),
        public string|Optional|null $end_at = new Optional(),
        public ?int $max_attempts = null,
        public ?ScoringMethod $scoring_method = null,
        public ?bool $proctoring_enabled = null,
        public int|Optional|null $department_id = new Optional(),
        public ?int $max_violations = null,
    ) {}

    public static function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'start_at' => ['sometimes', 'nullable', 'date'],
            'end_at' => ['sometimes', 'nullable', 'date'],
            'max_attempts' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'scoring_method' => ['sometimes', Rule::enum(ScoringMethod::class)],
            'proctoring_enabled' => ['sometimes', 'boolean'],
            'department_id' => ['sometimes', 'nullable', 'integer', 'exists:departments,id'],
            'max_violations' => ['sometimes', 'integer', 'min:0', 'max:20'],
        ];
    }
}
