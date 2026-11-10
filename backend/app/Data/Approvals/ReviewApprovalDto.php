<?php

namespace App\Data\Approvals;

use Spatie\LaravelData\Data;

class ReviewApprovalDto extends Data
{
    public function __construct(
        public ?string $comment = null,
    ) {}

    public static function rules(): array
    {
        return [
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
