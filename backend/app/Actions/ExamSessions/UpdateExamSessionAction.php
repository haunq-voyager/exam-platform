<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\UpdateExamSessionDto;
use App\Models\ExamSession;

class UpdateExamSessionAction
{
    public function execute(ExamSession $session, UpdateExamSessionDto $dto): ExamSession
    {
        $session->update(array_filter([
            'title' => $dto->title,
            'start_at' => $dto->start_at,
            'end_at' => $dto->end_at,
        ], fn ($value) => $value !== null));

        return $session;
    }
}
