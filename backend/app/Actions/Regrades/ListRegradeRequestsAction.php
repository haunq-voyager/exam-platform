<?php

namespace App\Actions\Regrades;

use App\Data\Regrades\ListRegradeRequestsDto;
use App\Models\RegradeRequest;
use App\Models\User;
use App\Services\Approvals\SessionAccess;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListRegradeRequestsAction
{
    public function __construct(
        private SessionAccess $sessionAccess,
    ) {}

    /** Requests of the sessions this staff member may see (a teacher: only the sessions they are assigned to). */
    public function execute(ListRegradeRequestsDto $dto, User $viewer): LengthAwarePaginator
    {
        $query = RegradeRequest::query()->with(['student', 'reviewer', 'attempt.session']);

        $query->whereHas('attempt.session', fn (Builder $sessions) => $this->sessionAccess->scopeVisible($sessions, $viewer));

        if (! blank($dto->status)) {
            $query->whereIn('status', $dto->status);
        }

        if ($dto->exam_session_id !== null) {
            $query->whereHas('attempt', fn (Builder $query) => $query->where('exam_session_id', $dto->exam_session_id));
        }

        return $query
            ->orderBy($dto->sort_by, $dto->sort_order)
            ->paginate(perPage: $dto->per_page, page: $dto->page);
    }
}
