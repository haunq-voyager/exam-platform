<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\AssignStudentDto;
use App\Models\ExamSession;
use App\Models\ExamSessionAssignment;

class AssignStudentToSessionAction
{
    public function execute(ExamSession $session, AssignStudentDto $dto): ExamSessionAssignment
    {
        return $session->assignments()->firstOrCreate([
            'student_id' => $dto->student_id,
        ]);
    }
}
