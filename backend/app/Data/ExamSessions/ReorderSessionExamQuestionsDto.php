<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class ReorderSessionExamQuestionsDto extends Data
{
    /** @param array<int, int> $ordered_question_ids question ids in their new order */
    public function __construct(
        public array $ordered_question_ids,
    ) {}

    public static function rules(): array
    {
        return [
            'ordered_question_ids' => ['required', 'array', 'min:1', 'max:500'],
            'ordered_question_ids.*' => ['integer'],
        ];
    }
}
