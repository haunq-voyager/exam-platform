<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\AssignTeacherDto;
use App\Models\ExamSession;

class AssignTeacherToSessionAction
{
    public function execute(ExamSession $session, AssignTeacherDto $dto): ExamSession
    {
        $session->teachers()->syncWithoutDetaching([$dto->teacher_id]);

        return $session->load('teachers');
    }
}
