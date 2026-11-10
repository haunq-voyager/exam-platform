<?php

namespace App\Data\Proctoring;

use Spatie\LaravelData\Data;

class ProctorCancelAttemptDto extends Data
{
    public function __construct(
        public string $note,
    ) {}

    public static function rules(): array
    {
        // Cancelling someone's exam must always be justified.
        return [
            'note' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }
}
