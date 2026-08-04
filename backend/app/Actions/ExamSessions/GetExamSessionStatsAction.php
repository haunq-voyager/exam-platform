<?php

namespace App\Actions\ExamSessions;

use App\Models\ExamSession;
use Illuminate\Support\Collection;

class GetExamSessionStatsAction
{
    public function execute(): Collection
    {
        return ExamSession::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
    }
}
