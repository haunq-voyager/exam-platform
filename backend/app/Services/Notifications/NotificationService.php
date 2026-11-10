<?php

namespace App\Services\Notifications;

use App\Enums\UserRole;
use App\Models\ApprovalLevel;
use App\Models\ExamSession;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;

/** Creates the in-app notifications (the bell). Sending the matching emails is done by ExamReminderService. */
class NotificationService
{
    /** Same role -> URL prefix mapping as the web app (frontend/lib/role-routes.ts). */
    private const AREA_PREFIX = [
        'student' => '',
        'teacher' => '/teacher',
        'admin' => '/admin',
        'department_head' => '/dean',
        'training_office' => '/training',
    ];

    /** Full web URL of a canonical "/dashboard/..." path for a role, for links in emails. */
    public static function webUrl(UserRole $role, string $canonicalPath): string
    {
        $rest = preg_replace('#^/dashboard#', '', $canonicalPath) ?? $canonicalPath;
        $path = (self::AREA_PREFIX[$role->value] ?? '').$rest;

        return rtrim((string) config('app.frontend_url'), '/').($path === '' ? '/' : $path);
    }

    /**
     * Creates one notification. With a `$dedupeKey` it is created at most once per user: asking again is a no-op,
     * which is what lets reminders run every few minutes without repeating themselves.
     *
     * @param  array<string, mixed>  $data
     */
    public function notify(User $user, string $type, string $title, ?string $body, ?string $url, ?string $dedupeKey = null, array $data = [], bool $email = false): ?Notification
    {
        if ($dedupeKey !== null && Notification::query()->where('user_id', $user->id)->where('dedupe_key', $dedupeKey)->exists()) {
            return null;
        }

        try {
            return Notification::create([
                'user_id' => $user->id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'url' => $url,
                'data' => $data ?: null,
                'dedupe_key' => $dedupeKey,
                'email_status' => $email ? 'pending' : null,
            ]);
        } catch (UniqueConstraintViolationException) {
            return null; // another run created it first
        }
    }

    // ---- Approval chain --------------------------------------------------------------------------------------

    /** Who is asked to act at a level: its role (inside the session's department when the level is scoped) and admins. */
    public function approversFor(ExamSession $session, ApprovalLevel $level, ?User $except = null): Collection
    {
        return User::query()
            ->where(function ($query) use ($session, $level) {
                $query->where(function ($query) use ($session, $level) {
                    $query->where('role', $level->role->value);
                    if ($level->isDepartmentScoped()) {
                        $query->where('department_id', $session->department_id ?? 0);
                    }
                })->orWhere('role', UserRole::Admin->value);
            })
            ->where('id', '!=', $session->created_by) // nobody approves their own session
            ->when($except, fn ($query) => $query->where('id', '!=', $except->id))
            ->get();
    }

    public function approvalRequested(ExamSession $session, ApprovalLevel $level, User $actor): void
    {
        $creator = $session->creator?->name ?? 'Một người dùng';
        foreach ($this->approversFor($session, $level, $actor) as $approver) {
            $this->notify(
                $approver,
                'approval_requested',
                'Kỳ thi cần bạn duyệt',
                sprintf('“%s” do %s tạo đang chờ %s.', $session->title, $creator, mb_strtolower($level->name)),
                '/dashboard/approvals',
                sprintf('approval:%d:%d:%s', $session->id, $level->position, $session->approval_submitted_at?->timestamp ?? '0'),
                ['exam_session_id' => $session->id],
            );
        }
    }

    public function approvalAdvanced(ExamSession $session, ApprovalLevel $from, ApprovalLevel $to, User $actor): void
    {
        $this->notifyCreator($session, 'approval_progress', 'Kỳ thi đã qua một cấp duyệt', sprintf('“%s” đã được %s duyệt, đang chờ %s.', $session->title, $from->name, mb_strtolower($to->name)), $actor);
        $this->approvalRequested($session, $to, $actor);
    }

    public function approvalApproved(ExamSession $session, User $actor): void
    {
        $this->notifyCreator($session, 'approval_approved', 'Kỳ thi đã được duyệt', sprintf('“%s” đã được duyệt xong, bạn có thể bật kỳ thi.', $session->title), $actor);
    }

    public function approvalRejected(ExamSession $session, User $actor, string $comment): void
    {
        $this->notifyCreator($session, 'approval_rejected', 'Kỳ thi bị từ chối', sprintf('“%s” bị %s từ chối: %s', $session->title, $actor->name, $comment), $actor);
    }

    private function notifyCreator(ExamSession $session, string $type, string $title, string $body, User $actor): void
    {
        $creator = $session->creator;
        if ($creator === null || $creator->id === $actor->id) {
            return;
        }

        $this->notify($creator, $type, $title, $body, '/dashboard/exam-sessions/'.$session->id, null, ['exam_session_id' => $session->id]);
    }
}
