<?php

namespace App\Data\Approvals;

use Spatie\LaravelData\Data;

class RejectApprovalDto extends Data
{
    public function __construct(
        public string $comment,
    ) {}

    public static function rules(): array
    {
        // A rejection must tell the creator what to fix.
        return [
            'comment' => ['required', 'string', 'min:3', 'max:2000'],
        ];
    }
}
