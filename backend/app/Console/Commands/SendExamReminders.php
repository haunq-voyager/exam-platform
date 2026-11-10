<?php

namespace App\Console\Commands;

use App\Services\Notifications\ExamReminderService;
use Illuminate\Console\Command;

class SendExamReminders extends Command
{
    protected $signature = 'reminders:send';

    protected $description = 'Create the due exam notifications (bell) and send the reminder emails';

    public function handle(ExamReminderService $reminders): int
    {
        $created = $reminders->createDueNotifications();
        [$sent, $failed] = $reminders->sendPendingEmails();

        $this->info("Created {$created} notification(s); sent {$sent} email(s), {$failed} failed.");

        return self::SUCCESS;
    }
}
