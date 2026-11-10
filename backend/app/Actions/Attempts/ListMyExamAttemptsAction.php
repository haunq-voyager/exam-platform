<?php

namespace App\Actions\Attempts;

use App\Models\ExamAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ListMyExamAttemptsAction
{
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
    ) {}

    public function execute(User $student): Collection
    {
        $this->expireOverdueAttemptsAction->execute(studentId: $student->id);

        return ExamAttempt::query()
            ->where('student_id', $student->id)
            ->with('session.exam')
            ->orderByDesc('started_at')
            ->get();
    }
}
