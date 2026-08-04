<?php

namespace App\Actions\Attempts;

use App\Models\ExamAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ListMyExamAttemptsAction
{
    public function execute(User $student): Collection
    {
        return ExamAttempt::query()
            ->where('student_id', $student->id)
            ->with('session.exam')
            ->orderByDesc('started_at')
            ->get();
    }
}
