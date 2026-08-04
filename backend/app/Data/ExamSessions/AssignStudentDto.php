<?php

namespace App\Data\ExamSessions;

use Spatie\LaravelData\Data;

class AssignStudentDto extends Data
{
    public function __construct(
        public int $student_id,
    ) {}

    public static function rules(): array
    {
        return [
            'student_id' => ['required', 'integer', 'exists:users,id'],
        ];
    }
}
