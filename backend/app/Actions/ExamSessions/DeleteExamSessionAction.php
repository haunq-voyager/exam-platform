<?php

namespace App\Actions\ExamSessions;

use App\Models\ExamSession;

class DeleteExamSessionAction
{
    public function execute(ExamSession $session): void
    {
        $session->delete();
    }
}
