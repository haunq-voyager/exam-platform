<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class UpdateExamSessionDto extends Data
{
    public function __construct(
        public ?string $title = null,
        public ?string $start_at = null,
        public ?string $end_at = null,
    ) {}

    public static function rules(): array
    {
        return [
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'start_at' => ['sometimes', 'nullable', 'date'],
            'end_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
