<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class AssignTeacherDto extends Data
{
    public function __construct(
        public int $teacher_id,
    ) {}

    public static function rules(): array
    {
        return [
            'teacher_id' => ['required', 'integer', 'exists:users,id'],
        ];
    }
}
