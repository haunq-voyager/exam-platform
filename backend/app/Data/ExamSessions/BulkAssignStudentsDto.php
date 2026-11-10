<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

/**
 * Either an explicit list of students, or a filter (major and/or search) meaning "every not-yet-assigned student matching it".
 */
class BulkAssignStudentsDto extends Data
{
    public function __construct(
        public ?array $student_ids = null,
        public ?string $major = null,
        public ?string $search = null,
    ) {}

    public static function rules(): array
    {
        return [
            'student_ids' => ['nullable', 'array', 'max:2000', 'required_without_all:major,search'],
            'student_ids.*' => ['integer', 'exists:users,id'],
            'major' => ['nullable', 'string', 'max:255', 'required_without_all:student_ids,search'],
            'search' => ['nullable', 'string', 'required_without_all:student_ids,major'],
        ];
    }
}
