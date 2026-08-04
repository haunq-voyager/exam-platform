<?php

namespace App\Actions\ExamSessions;

use App\Models\ExamSessionAssignment;

class UnassignStudentFromSessionAction
{
    public function execute(ExamSessionAssignment $assignment): void
    {
        $assignment->delete();
    }
}
