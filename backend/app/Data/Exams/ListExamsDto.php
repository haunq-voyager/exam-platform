<?php

namespace App\Data\Exams;

use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class ListExamsDto extends Data
{
    private const SORTABLE_COLUMNS = ['id', 'title', 'duration_minutes', 'created_at'];

    public function __construct(
        public ?string $search = null,
        public string $sort_by = 'created_at',
        public string $sort_order = 'desc',
        public int $per_page = 15,
        public int $page = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'sort_by' => ['string', Rule::in(self::SORTABLE_COLUMNS)],
            'sort_order' => ['string', Rule::in(['asc', 'desc'])],
            'per_page' => ['integer', 'min:1', 'max:100'],
            'page' => ['integer', 'min:1'],
        ];
    }
}
