<?php

namespace App\Actions\Attempts;

use App\Models\ExamSession;
use Illuminate\Database\Eloquent\Collection;

class ListExamAttemptsForSessionAction
{
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
    ) {}

    public function execute(ExamSession $session): Collection
    {
        $this->expireOverdueAttemptsAction->execute(sessionId: $session->id);

        return $session->attempts()
            ->with('student')
            ->orderByDesc('started_at')
            ->get();
    }
}
