<?php

namespace App\Services\Approvals;

use App\Enums\Permission;
use App\Models\ExamSession;
use App\Models\User;
use App\Services\Auth\PermissionService;
use Illuminate\Database\Eloquent\Builder;

/** Which exam sessions a staff member may see (the list filter and the single-session check share one rule). */
class SessionAccess
{
    public function __construct(
        private PermissionService $permissions,
        private ApprovalService $approvals,
    ) {}

    public function canView(User $user, ExamSession $session): bool
    {
        if ($user->isAdmin() || $session->created_by === $user->id) {
            return true;
        }

        if ($session->teachers()->where('users.id', $user->id)->exists()) {
            return true;
        }

        if ($this->permissions->has($user, Permission::SessionsViewAll)
            && ($user->department_id === null || $user->department_id === $session->department_id)) {
            return true;
        }

        return $this->approvals->mayReadAsApprover($user, $session);
    }

    /**
     * @param  Builder<ExamSession>  $query
     */
    public function scopeVisible(Builder $query, User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $viewAll = $this->permissions->has($user, Permission::SessionsViewAll);

        $query->where(function (Builder $query) use ($user, $viewAll) {
            $query->where('created_by', $user->id)
                ->orWhereHas('teachers', fn (Builder $teachers) => $teachers->where('users.id', $user->id))
                ->orWhereHas('approvals', fn (Builder $approvals) => $approvals->where('actor_id', $user->id));

            if ($viewAll) {
                $user->department_id === null
                    ? $query->orWhereRaw('1 = 1')
                    : $query->orWhere('department_id', $user->department_id);
            }

            // Sessions currently waiting for this user's approval.
            $query->orWhere(fn (Builder $awaiting) => $this->approvals->scopeAwaiting($awaiting, $user));
        });
    }
}
