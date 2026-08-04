<?php

namespace App\Data\Exams;

use Spatie\LaravelData\Data;

class AddExamQuestionDto extends Data
{
    public function __construct(
        public int $question_id,
        public int $order = 0,
        public float $points = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'question_id' => ['required', 'integer', 'exists:questions,id'],
            'order' => ['integer', 'min:0'],
            'points' => ['numeric', 'min:0'],
        ];
    }
}
