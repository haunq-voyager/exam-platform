<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class UpdateSessionExamQuestionDto extends Data
{
    public function __construct(
        public float $points,
    ) {}

    public static function rules(): array
    {
        return [
            'points' => ['required', 'numeric', 'min:0', 'max:1000'],
        ];
    }
}
