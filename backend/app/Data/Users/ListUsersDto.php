<?php

namespace App\Data\Users;

use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class ListUsersDto extends Data
{
    private const SORTABLE_COLUMNS = ['id', 'name', 'email', 'user_code', 'major', 'class_code', 'academic_year', 'role', 'created_at'];

    public function __construct(
        public ?string $search = null,
        public ?string $role = null,
        public ?string $major = null,
        public ?string $class_code = null,
        public ?int $department_id = null,
        public string $sort_by = 'name',
        public string $sort_order = 'asc',
        public int $per_page = 15,
        public int $page = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'role' => ['nullable', 'string'],
            'major' => ['nullable', 'string'],
            'class_code' => ['nullable', 'string'],
            'department_id' => ['nullable', 'integer'],
            'sort_by' => ['string', Rule::in(self::SORTABLE_COLUMNS)],
            'sort_order' => ['string', Rule::in(['asc', 'desc'])],
            'per_page' => ['integer', 'min:1', 'max:100'],
            'page' => ['integer', 'min:1'],
        ];
    }
}
