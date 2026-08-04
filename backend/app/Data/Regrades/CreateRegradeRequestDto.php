<?php

namespace App\Data\Regrades;

use Spatie\LaravelData\Data;

class CreateRegradeRequestDto extends Data
{
    public function __construct(
        public int $exam_attempt_id,
        public string $reason,
    ) {}

    public static function rules(): array
    {
        return [
            'exam_attempt_id' => ['required', 'integer', 'exists:exam_attempts,id'],
            'reason' => ['required', 'string', 'max:2000'],
        ];
    }
}
