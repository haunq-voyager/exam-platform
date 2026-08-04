<?php

namespace App\Data\Proctoring;

use App\Enums\ProctoringEventType;
use App\Enums\ProctoringSeverity;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class RecordProctoringEventDto extends Data
{
    public function __construct(
        public ProctoringEventType $event_type,
        public ProctoringSeverity $severity,
        public ?string $occurred_at = null,
        public ?array $metadata = null,
    ) {}

    public static function rules(): array
    {
        return [
            'event_type' => ['required', Rule::enum(ProctoringEventType::class)],
            'severity' => ['required', Rule::enum(ProctoringSeverity::class)],
            'occurred_at' => ['nullable', 'date'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}
