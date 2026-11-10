<?php

namespace App\Services\Approvals;

use App\Exceptions\ApiException;
use App\Models\ApprovalLevel;
use App\Models\ExamSession;
use App\Models\ExamSessionApproval;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Collection;

/**
 * The approval chain of exam sessions: draft -> pending (level 1 .. n) -> approved, or rejected (sent back).
 *
 * Levels are configured by administrators. A session may only be switched on once it is approved; with no active
 * level configured nothing needs approval.
 */
class ApprovalService
{
    public const DRAFT = 'draft';

    public const PENDING = 'pending';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    /** @var Collection<int, ApprovalLevel>|null */
    private ?Collection $levels = null;

    /** @return Collection<int, ApprovalLevel> active levels in order */
    public function activeLevels(): Collection
    {
        return $this->levels ??= ApprovalLevel::query()->where('is_active', true)->orderBy('position')->get();
    }

    public function forgetLevels(): void
    {
        $this->levels = null;
    }

    public function isRequired(): bool
    {
        return $this->activeLevels()->isNotEmpty();
    }

    /** The level a pending session is currently waiting at (the first active level at or after its position). */
    public function levelFor(ExamSession $session): ?ApprovalLevel
    {
        if ($session->approval_status !== self::PENDING || $session->approval_position === null) {
            return null;
        }

        return $this->activeLevels()->first(fn (ApprovalLevel $level) => $level->position >= $session->approval_position);
    }

    private function levelAfter(int $position): ?ApprovalLevel
    {
        return $this->activeLevels()->first(fn (ApprovalLevel $level) => $level->position > $position);
    }

    private function userMatchesLevel(User $user, ApprovalLevel $level, ExamSession $session): bool
    {
        if ($user->role !== $level->role) {
            return false;
        }

        return ! $level->isDepartmentScoped()
            || ($user->department_id !== null && $user->department_id === $session->department_id);
    }

    /** Who may approve/reject the session right now. Nobody approves their own session; admins may act at any level. */
    public function canAct(User $user, ExamSession $session): bool
    {
        $level = $this->levelFor($session);
        if ($level === null || $session->created_by === $user->id) {
            return false;
        }

        return $user->isAdmin() || $this->userMatchesLevel($user, $level, $session);
    }

    /** True when the user could ever be asked to approve something (used for the "Phê duyệt" menu). */
    public function isApprover(User $user): bool
    {
        if ($user->isAdmin()) {
            return $this->isRequired();
        }

        return $this->activeLevels()->contains(fn (ApprovalLevel $level) => $level->role === $user->role);
    }

    /** Whether the user is a (past or present) approver of the session, i.e. may read it. */
    public function mayReadAsApprover(User $user, ExamSession $session): bool
    {
        $level = $this->levelFor($session);
        if ($level !== null && ($user->isAdmin() || $this->userMatchesLevel($user, $level, $session))) {
            return true;
        }

        return $session->approvals()->where('actor_id', $user->id)->exists();
    }

    /**
     * Restricts a query of ExamSession to those waiting for this user (as approver).
     *
     * @param  \Illuminate\Database\Eloquent\Builder<ExamSession>  $query
     */
    public function scopeAwaiting($query, User $user): void
    {
        $query->where('approval_status', self::PENDING)->where('created_by', '!=', $user->id);

        if ($user->isAdmin()) {
            return;
        }

        $mine = $this->activeLevels()->filter(fn (ApprovalLevel $level) => $level->role === $user->role);
        if ($mine->isEmpty()) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function ($query) use ($mine, $user) {
            foreach ($mine as $level) {
                $query->orWhere(function ($query) use ($level, $user) {
                    // A session at level N waits at the first active level with position >= approval_position.
                    $previous = $this->activeLevels()->filter(fn (ApprovalLevel $other) => $other->position < $level->position)->max('position') ?? 0;
                    $query->where('approval_position', '>', $previous)->where('approval_position', '<=', $level->position);
                    if ($level->isDepartmentScoped()) {
                        $query->where('department_id', $user->department_id ?? 0);
                    }
                });
            }
        });
    }

    public function submit(ExamSession $session, User $actor): ExamSession
    {
        if (! in_array($session->approval_status, [self::DRAFT, self::REJECTED], true)) {
            throw new ApiException('This session is already waiting for approval or approved.', 'approval.invalid_state', 422);
        }

        if (! $session->exam()->first()?->examQuestions()->exists()) {
            throw new ApiException('The exam has no questions yet.', 'exam_session.no_questions', 422);
        }

        $first = $this->activeLevels()->first();
        if ($first === null) {
            $session->update(['approval_status' => self::APPROVED, 'approval_position' => null, 'approval_submitted_at' => now(), 'approved_at' => now()]);
            $this->log($session, 'auto_approved', $actor, null, 'Không có cấp duyệt nào được cấu hình.');

            return $session;
        }

        if ($session->department_id === null && $this->activeLevels()->contains(fn (ApprovalLevel $level) => $level->isDepartmentScoped())) {
            throw new ApiException('Choose the department of the session before sending it for approval.', 'approval.department_required', 422);
        }

        $session->update([
            'approval_status' => self::PENDING,
            'approval_position' => $first->position,
            'approval_submitted_at' => now(),
            'approved_at' => null,
        ]);
        $this->log($session, 'submitted', $actor, $first);
        $this->notifySafely(fn (NotificationService $notifications) => $notifications->approvalRequested($session, $first, $actor));

        return $session;
    }

    public function withdraw(ExamSession $session, User $actor): ExamSession
    {
        if ($session->approval_status !== self::PENDING) {
            throw new ApiException('Only a session waiting for approval can be withdrawn.', 'approval.invalid_state', 422);
        }

        $session->update(['approval_status' => self::DRAFT, 'approval_position' => null]);
        $this->log($session, 'withdrawn', $actor);

        return $session;
    }

    public function approve(ExamSession $session, User $actor, ?string $comment): ExamSession
    {
        $level = $this->assertCanAct($actor, $session);
        $this->log($session, 'approved', $actor, $level, $comment);

        $next = $this->levelAfter($level->position);
        if ($next !== null) {
            $session->update(['approval_position' => $next->position]);
            $this->notifySafely(fn (NotificationService $notifications) => $notifications->approvalAdvanced($session, $level, $next, $actor));
        } else {
            $session->update(['approval_status' => self::APPROVED, 'approval_position' => null, 'approved_at' => now()]);
            $this->notifySafely(fn (NotificationService $notifications) => $notifications->approvalApproved($session, $actor));
        }

        return $session;
    }

    public function reject(ExamSession $session, User $actor, string $comment): ExamSession
    {
        $level = $this->assertCanAct($actor, $session);
        $this->log($session, 'rejected', $actor, $level, $comment);
        $session->update(['approval_status' => self::REJECTED, 'approval_position' => null, 'approved_at' => null]);
        $this->notifySafely(fn (NotificationService $notifications) => $notifications->approvalRejected($session, $actor, $comment));

        return $session;
    }

    /**
     * Called before a material change (exam content, schedule, attempt/proctoring settings, department).
     * A session waiting for approval must not change under the approver's feet; an approved one goes back to
     * draft (and is switched off) because what was approved no longer exists.
     */
    public function beforeMaterialChange(ExamSession $session, User $actor): void
    {
        if (! $this->isRequired()) {
            return;
        }

        if ($session->approval_status === self::PENDING) {
            throw new ApiException('The session is waiting for approval; withdraw it before changing it.', 'approval.locked_pending', 422);
        }

        if ($session->approval_status === self::APPROVED) {
            $session->update([
                'approval_status' => self::DRAFT,
                'approval_position' => null,
                'approved_at' => null,
                'status' => \App\Enums\ExamStatus::Draft,
            ]);
            $this->log($session, 'reset', $actor, null, 'Nội dung kỳ thi đã thay đổi sau khi duyệt, cần gửi duyệt lại.');
        }
    }

    /** A failing notification must never undo or block an approval decision. */
    private function notifySafely(callable $callback): void
    {
        try {
            $callback(app(NotificationService::class));
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    private function assertCanAct(User $actor, ExamSession $session): ApprovalLevel
    {
        $level = $this->levelFor($session);
        if ($level === null) {
            throw new ApiException('This session is not waiting for approval.', 'approval.invalid_state', 422);
        }

        if (! $this->canAct($actor, $session)) {
            throw new ApiException('You cannot approve this session at its current level.', 'approval.not_allowed', 403);
        }

        return $level;
    }

    private function log(ExamSession $session, string $action, ?User $actor, ?ApprovalLevel $level = null, ?string $comment = null): void
    {
        ExamSessionApproval::create([
            'exam_session_id' => $session->id,
            'level_id' => $level?->id,
            'level_position' => $level?->position,
            'level_name' => $level?->name,
            'action' => $action,
            'actor_id' => $actor?->id,
            'comment' => $comment,
        ]);
    }
}
