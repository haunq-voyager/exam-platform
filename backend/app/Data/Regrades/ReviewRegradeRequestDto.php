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
        public ?string $response = null,
    ) {}

    public static function rules(): array
    {
        return [
            'status' => ['required', Rule::in([RegradeRequestStatus::Approved->value, RegradeRequestStatus::Rejected->value])],
            // An approval states the corrected score; a rejection must explain why the score stays.
            'new_score' => ['nullable', 'numeric', 'min:0', 'required_if:status,approved'],
            'response' => ['nullable', 'string', 'max:2000', 'required_if:status,rejected'],
        ];
    }
}
