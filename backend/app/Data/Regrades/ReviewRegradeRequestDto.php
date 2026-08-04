<?php

namespace App\Data\Regrades;

use App\Enums\RegradeRequestStatus;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class ReviewRegradeRequestDto extends Data
{
    public function __construct(
        public RegradeRequestStatus $status,
        public ?float $new_score = null,
    ) {}

    public static function rules(): array
    {
        return [
            'status' => ['required', Rule::in([RegradeRequestStatus::Approved->value, RegradeRequestStatus::Rejected->value])],
            'new_score' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
