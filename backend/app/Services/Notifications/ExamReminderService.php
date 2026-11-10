<?php

namespace App\Services\Notifications;

use App\Enums\ExamStatus;
use App\Enums\UserRole;
use App\Models\ExamSession;
use App\Models\MailTemplate;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;

/**
 * Time-based reminders. Safe to run as often as wanted: every reminder is keyed (session + person + kind), so it is
 * created once. Students: at each configured number of days before the start (bell + email) and "now open" (bell). Teachers assigned to the
 * session: a day before and "now open" (bell).
 */
class ExamReminderService
{
    /** Days before the start at which the student email is sent. */
    public const STUDENT_REMINDER_DAYS = 7;

    private const TZ = 'Asia/Ho_Chi_Minh';

    public function __construct(
        private NotificationService $notifications,
        private MailTemplateRenderer $renderer,
    ) {}

    /** Days before the start at which students are reminded (set by the administrator on the email template). */
    public function reminderDays(): array
    {
        $template = MailTemplate::query()->where('key', MailTemplate::STUDENT_EXAM_REMINDER)->first();

        return $template?->days() ?? [self::STUDENT_REMINDER_DAYS];
    }

    /** Creates the due notifications (no emails are sent here). Returns how many were created. */
    public function createDueNotifications(): int
    {
        $created = 0;
        $now = now();
        $days = $this->reminderDays();

        $sessions = ExamSession::query()
            ->where('status', ExamStatus::Open)
            ->where('approval_status', 'approved')
            ->whereNotNull('start_at')
            ->where('start_at', '<=', $now->copy()->addDays(max($days)))
            ->where(fn ($query) => $query->whereNull('end_at')->orWhere('end_at', '>', $now))
            ->with(['assignments.student', 'teachers', 'department'])
            ->get();

        foreach ($sessions as $session) {
            $started = $session->start_at->lessThanOrEqualTo($now);
            $withinDay = $session->start_at->lessThanOrEqualTo($now->copy()->addDay());

            foreach ($session->assignments as $assignment) {
                $student = $assignment->student;
                if ($student === null) {
                    continue;
                }

                $link = '/dashboard/student-exams/'.$session->id;
                if ($started) {
                    $created += (int) (bool) $this->notifications->notify($student, 'exam_started', 'Kỳ thi đã mở', sprintf('“%s” đã bắt đầu, bạn có thể vào làm bài.', $session->title), $link, "started:{$session->id}:{$student->id}");
                    continue;
                }

                // Several thresholds can already be due (session switched on late): only the nearest one fires,
                // so a student is never sent "7 days", "3 days" and "1 day" reminders at once.
                $threshold = $this->nearestDueThreshold($days, $session->start_at, $now);
                if ($threshold === null) {
                    continue;
                }

                $left = $this->daysLeft($session->start_at);
                $created += (int) (bool) $this->notifications->notify(
                    $student,
                    'exam_reminder',
                    'Sắp đến kỳ thi',
                    $left <= 1
                        ? sprintf('“%s” bắt đầu lúc %s (trong vòng 24 giờ tới).', $session->title, $this->format($session->start_at))
                        : sprintf('“%s” bắt đầu lúc %s (còn %d ngày).', $session->title, $this->format($session->start_at), $left),
                    $link,
                    "r{$threshold}:{$session->id}:{$student->id}",
                    ['exam_session_id' => $session->id],
                    email: true,
                );
            }

            foreach ($session->teachers as $teacher) {
                $link = '/dashboard/proctoring';
                if ($started) {
                    $created += (int) (bool) $this->notifications->notify($teacher, 'proctor_started', 'Kỳ thi đang diễn ra', sprintf('“%s” đã bắt đầu, vào Coi thi để theo dõi thí sinh.', $session->title), $link, "started:{$session->id}:{$teacher->id}");
                } elseif ($withinDay) {
                    $created += (int) (bool) $this->notifications->notify($teacher, 'proctor_upcoming', 'Kỳ thi sắp diễn ra', sprintf('Bạn được phân công coi “%s” lúc %s.', $session->title, $this->format($session->start_at)), $link, "r1:{$session->id}:{$teacher->id}");
                }
            }
        }

        return $created;
    }

    /** Sends the emails of the notifications that are waiting for one. Returns [sent, failed]. */
    public function sendPendingEmails(int $limit = 200): array
    {
        $template = MailTemplate::query()->where('key', MailTemplate::STUDENT_EXAM_REMINDER)->first();
        $sent = 0;
        $failed = 0;

        Notification::query()->where('email_status', 'pending')->with('user')->orderBy('id')->limit($limit)->get()
            ->each(function (Notification $notification) use ($template, &$sent, &$failed) {
                $user = $notification->user;
                $session = ExamSession::query()->with(['exam.examQuestions', 'department'])->find($notification->data['exam_session_id'] ?? 0);

                // A disabled template, a deleted session or an account without email: nothing to send, do not retry.
                if ($template === null || ! $template->is_active || $user === null || $session === null || blank($user->email)) {
                    $notification->update(['email_status' => null]);

                    return;
                }

                try {
                    ['subject' => $subject, 'html' => $html] = $this->renderer->renderModel($template, $this->variablesFor($session, $user), $this->examUrl($session, $user));
                    Mail::html($html, fn ($message) => $message->to($user->email, $user->name)->subject($subject));
                    $notification->update(['email_status' => 'sent']);
                    $sent++;
                } catch (\Throwable $exception) {
                    report($exception);
                    $notification->update(['email_status' => 'failed']);
                    $failed++;
                }
            });

        return [$sent, $failed];
    }

    /** Values of the template placeholders for one student and session. @return array<string, string> */
    public function variablesFor(ExamSession $session, User $student): array
    {
        $exam = $session->exam;

        return [
            'student_name' => $student->name,
            'exam_title' => $session->title,
            'exam_code' => (string) ($session->code ?? ''),
            'start_time' => $session->start_at ? $this->format($session->start_at) : 'Chưa đặt lịch',
            'end_time' => $session->end_at ? $this->format($session->end_at) : 'Không giới hạn',
            'duration' => (string) ($exam?->duration_minutes ?? ''),
            'question_count' => (string) ($exam?->examQuestions?->count() ?? 0),
            'max_attempts' => (string) $session->max_attempts,
            'days_left' => $session->start_at ? (string) $this->daysLeft($session->start_at) : '0',
            'proctoring_note' => $session->proctoring_enabled
                ? sprintf('Có giám sát bằng camera, cảnh báo tối đa %d lần', $session->max_violations)
                : 'Không giám sát bằng camera',
            'department_name' => (string) ($session->department?->name ?? ''),
            'exam_url' => $this->examUrl($session, $student),
            'app_name' => (string) config('app.name'),
        ];
    }

    public function examUrl(ExamSession $session, User $user): string
    {
        return NotificationService::webUrl($user->role instanceof UserRole ? $user->role : UserRole::Student, '/dashboard/student-exams/'.$session->id);
    }

    /** The smallest configured number of days that the start is already within, or null when none is due yet. */
    private function nearestDueThreshold(array $days, Carbon $start, Carbon $now): ?int
    {
        $due = array_filter($days, fn (int $day) => $start->lessThanOrEqualTo($now->copy()->addDays($day)));

        return $due === [] ? null : min($due);
    }

    private function daysLeft(Carbon $start): int
    {
        return max(0, (int) ceil(now()->diffInHours($start, false) / 24));
    }

    private function format(Carbon $time): string
    {
        return $time->copy()->timezone(self::TZ)->format('H:i d/m/Y');
    }
}
