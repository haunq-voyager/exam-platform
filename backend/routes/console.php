<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Actions\Attempts\SubmitExamAttemptAction;
use App\Enums\ExamAttemptStatus;
use App\Models\ExamAttempt;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('exam-attempts:submit-expired', function () {
    $submitAction = app(SubmitExamAttemptAction::class);
    $submittedCount = 0;

    ExamAttempt::query()
        ->with('exam')
        ->where('status', ExamAttemptStatus::InProgress)
        ->whereNotNull('started_at')
        ->chunkById(100, function ($attempts) use ($submitAction, &$submittedCount) {
            foreach ($attempts as $attempt) {
                $expiresAt = $attempt->started_at->copy()->addMinutes($attempt->exam->duration_minutes);

                if ($expiresAt->isFuture()) {
                    continue;
                }

                $submitAction->executeSystem($attempt);
                $submittedCount++;
            }
        });

    $this->info("Submitted {$submittedCount} expired exam attempt(s).");
})->purpose('Submit in-progress exam attempts after their duration expires');

Schedule::command('exam-attempts:submit-expired')->everyMinute()->withoutOverlapping();
