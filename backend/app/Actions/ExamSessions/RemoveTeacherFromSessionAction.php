<?php

namespace App\Actions\ExamSessions;

use App\Models\ExamSession;
use App\Models\User;

class RemoveTeacherFromSessionAction
{
    public function execute(ExamSession $session, User $teacher): void
    {
        $session->teachers()->detach($teacher->id);
    }
}
