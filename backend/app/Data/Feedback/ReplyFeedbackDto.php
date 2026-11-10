<?php

namespace App\Data\Feedback;

use Spatie\LaravelData\Data;

class ReplyFeedbackDto extends Data
{
    public function __construct(
        public string $reply,
    ) {}

    public static function rules(): array
    {
        return [
            'reply' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }
}
