<?php

namespace App\Actions\Attempts;

use App\Models\ExamSession;
use Illuminate\Database\Eloquent\Collection;

class ListExamAttemptsForSessionAction
{
    public function execute(ExamSession $session): Collection
    {
        return $session->attempts()
            ->with('student')
            ->orderByDesc('started_at')
            ->get();
    }
}
