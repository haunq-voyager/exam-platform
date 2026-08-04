<?php

namespace App\Data\Attempts;

use Spatie\LaravelData\Data;

class SaveAnswerDto extends Data
{
    public function __construct(
        public int $question_id,
        public array $selected_answer,
    ) {}

    public static function rules(): array
    {
        return [
            'question_id' => ['required', 'integer', 'exists:questions,id'],
            'selected_answer' => ['required', 'array'],
        ];
    }
}
