<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\ListExamSessionsDto;
use App\Models\ExamSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListExamSessionsAction
{
    public function execute(ListExamSessionsDto $dto): LengthAwarePaginator
    {
        $query = ExamSession::query()
            ->with(['exam' => fn ($query) => $query->withCount('examQuestions'), 'creator', 'teachers'])
            ->withCount(['assignments', 'attempts']);

        $this->applySearch($query, $dto->search);

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

        $query->where('title', 'ILIKE', "%{$keyword}%");
    }
}
