<?php

namespace App\Actions\ExamSessions;

use App\Enums\ExamStatus;
use App\Models\ExamSession;

class PublishExamSessionAction
{
    public function execute(ExamSession $session): ExamSession
    {
        $session->update(['status' => ExamStatus::Open]);

        return $session;
    }
}
