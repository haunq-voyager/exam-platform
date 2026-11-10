<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class AddSessionExamQuestionsDto extends Data
{
    public function __construct(
        public array $question_ids,
        public float $points = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'question_ids' => ['required', 'array', 'min:1', 'max:200'],
            'question_ids.*' => ['integer', 'exists:questions,id'],
            'points' => ['numeric', 'min:0', 'max:1000'],
        ];
    }
}
