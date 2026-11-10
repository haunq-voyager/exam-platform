<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class ListAssignableStudentsDto extends Data
{
    public function __construct(
        public ?string $search = null,
        public ?string $major = null,
        public int $per_page = 50,
        public int $page = 1,
    ) {}

    public static function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'major' => ['nullable', 'string', 'max:255'],
            'per_page' => ['integer', 'min:1', 'max:100'],
            'page' => ['integer', 'min:1'],
        ];
    }
}
