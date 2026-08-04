<?php

namespace App\Actions\ExamSessions;

use App\Enums\ExamStatus;
use App\Models\ExamSession;

class CloseExamSessionAction
{
    public function execute(ExamSession $session): ExamSession
    {
        $session->update(['status' => ExamStatus::Closed]);

        return $session;
    }
}
