<?php

namespace App\Data\ExamSessions;

use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class ListExamSessionsDto extends Data
{
    private const SORTABLE_COLUMNS = ['id', 'title', 'status', 'start_at', 'created_at'];

    public function __construct(
        public ?string $search = null,
        public ?array $status = null,
        public ?int $teacher_id = null,
        public string $sort_by = 'created_at',
        public string $sort_order = 'desc',
        public int $per_page = 15,
        public int $page = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'status' => ['array', 'nullable'],
            'teacher_id' => ['nullable', 'integer'],
            'sort_by' => ['string', Rule::in(self::SORTABLE_COLUMNS)],
            'sort_order' => ['string', Rule::in(['asc', 'desc'])],
            'per_page' => ['integer', 'min:1', 'max:100'],
            'page' => ['integer', 'min:1'],
        ];
    }

    private const FIELDS_TO_ARRAY = ['status'];

    public static function prepareForPipeline(array $properties): array
    {
        foreach (self::FIELDS_TO_ARRAY as $field) {
            if (isset($properties[$field])) {
                $properties[$field] = collect(
                    is_array($properties[$field])
                        ? $properties[$field]
                        : explode(',', (string) $properties[$field])
                )
                    ->map(fn ($value) => trim((string) $value))
                    ->filter(fn ($value) => $value !== '')
                    ->values()
                    ->all();
            }
        }

        return $properties;
    }
}
