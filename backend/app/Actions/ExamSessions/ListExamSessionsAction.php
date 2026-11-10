<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\ListExamSessionsDto;
use App\Models\ExamSession;
use App\Models\User;
use App\Services\Approvals\SessionAccess;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class ListExamSessionsAction
{
    public function __construct(
        private SessionAccess $sessionAccess,
    ) {}

    public function execute(ListExamSessionsDto $dto, User $viewer): LengthAwarePaginator
    {
        $query = ExamSession::query()
            ->with(['exam' => fn ($query) => $query->withCount('examQuestions'), 'creator', 'teachers', 'department'])
            ->withCount(['assignments', 'attempts']);

        // Staff only see the sessions their role/department/assignments allow; see SessionAccess.
        $this->sessionAccess->scopeVisible($query, $viewer);

        $this->applySearch($query, $dto->search);

        if ($dto->approval_status !== null) {
            $query->where('approval_status', $dto->approval_status);
        }

        if ($dto->department_id !== null) {
            $query->where('department_id', $dto->department_id);
        }

        if (! blank($dto->start_from)) {
            $query->where('start_at', '>=', Carbon::parse($dto->start_from)->startOfDay());
        }

        if (! blank($dto->start_to)) {
            $query->where('start_at', '<=', Carbon::parse($dto->start_to)->endOfDay());
        }

        if (! blank($dto->status)) {
            $query->whereIn('status', $dto->status);
        }

        if ($dto->teacher_id !== null) {
            $query->whereHas('teachers', fn (Builder $query) => $query->where('users.id', $dto->teacher_id));
        }

        return $query
            ->orderBy($dto->sort_by, $dto->sort_order)
            ->paginate(perPage: $dto->per_page, page: $dto->page);
    }

    private function applySearch(Builder $query, ?string $keyword): void
    {
        $keyword = trim((string) $keyword);
        if ($keyword === '') {
            return;
        }

        $query->where(fn (Builder $query) => $query
            ->where('title', 'ILIKE', "%{$keyword}%")
            ->orWhere('code', 'ILIKE', "%{$keyword}%"));
    }
}
