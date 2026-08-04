<?php

namespace App\Actions\Proctoring;

use App\Models\ExamAttempt;
use Illuminate\Database\Eloquent\Collection;

class ListProctoringEventsAction
{
    public function execute(ExamAttempt $attempt): Collection
    {
        $session = $attempt->proctoringSession;

        if ($session === null) {
            return new Collection();
        }

        return $session->events()->orderByDesc('occurred_at')->get();
    }
}
