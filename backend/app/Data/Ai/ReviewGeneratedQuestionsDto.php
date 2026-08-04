<?php

namespace App\Data\Ai;

use Spatie\LaravelData\Data;

class ReviewGeneratedQuestionsDto extends Data
{
    public function __construct(
        public ?array $generated_question_ids = null,
    ) {}

    public static function rules(): array
    {
        return [
            'generated_question_ids' => ['nullable', 'array'],
            'generated_question_ids.*' => ['integer'],
        ];
    }
}
