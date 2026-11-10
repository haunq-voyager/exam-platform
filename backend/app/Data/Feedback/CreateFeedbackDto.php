<?php

namespace App\Data\Feedback;

use Spatie\LaravelData\Data;

class CreateFeedbackDto extends Data
{
    public function __construct(
        public string $message,
        public ?int $exam_attempt_id = null,
    ) {}

    public static function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:3', 'max:2000'],
            'exam_attempt_id' => ['nullable', 'integer', 'exists:exam_attempts,id'],
        ];
    }
}
