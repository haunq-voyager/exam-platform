<?php

namespace App\Data\QuestionBank;

use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class ListQuestionsDto extends Data
{
    private const SORTABLE_COLUMNS = ['id', 'difficulty', 'status', 'created_at'];

    public function __construct(
        public ?string $search = null,
        public ?int $topic_id = null,
        public ?array $difficulty = null,
        public ?array $status = null,
        public string $sort_by = 'created_at',
        public string $sort_order = 'desc',
        public int $per_page = 15,
        public int $page = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'topic_id' => ['nullable', 'integer'],
            'difficulty' => ['array', 'nullable'],
            'status' => ['array', 'nullable'],
            'sort_by' => ['string', Rule::in(self::SORTABLE_COLUMNS)],
            'sort_order' => ['string', Rule::in(['asc', 'desc'])],
            'per_page' => ['integer', 'min:1', 'max:100'],
            'page' => ['integer', 'min:1'],
        ];
    }

    private const FIELDS_TO_ARRAY = ['difficulty', 'status'];

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
