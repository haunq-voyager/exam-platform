<?php

namespace App\Actions\ExamSessions;

use App\Actions\Attempts\ExpireOverdueAttemptsAction;
use App\Models\ExamSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ListAssignedSessionsAction
{
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
    ) {}

    public function execute(User $student): Collection
    {
        $this->expireOverdueAttemptsAction->execute(studentId: $student->id);

        return ExamSession::query()
            ->whereHas('assignments', fn ($query) => $query->where('student_id', $student->id))
            ->whereIn('status', ['scheduled', 'open', 'closed'])
            ->with(['exam' => fn ($query) => $query->withCount('examQuestions')])
            ->with(['attempts' => fn ($query) => $query->where('student_id', $student->id)])
            ->orderByDesc('start_at')
            ->get();
    }
}
