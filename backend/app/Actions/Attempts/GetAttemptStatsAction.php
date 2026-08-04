<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Models\ExamAttempt;
use Illuminate\Support\Collection;

class GetAttemptStatsAction
{
    public function execute(int $days = 30): Collection
    {
        return ExamAttempt::query()
            ->where('status', ExamAttemptStatus::Graded)
            ->where('submitted_at', '>=', now()->subDays($days)->startOfDay())
            ->selectRaw('DATE(submitted_at) as day, count(*) as attempt_count, avg(score) as average_score')
            ->groupBy('day')
            ->orderBy('day')
            ->get();
    }
}
