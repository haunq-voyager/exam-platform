<?php

namespace App\Actions\Exams;

use App\Data\Exams\ListExamsDto;
use App\Models\Exam;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListExamsAction
{
    public function execute(ListExamsDto $dto): LengthAwarePaginator
    {
        $query = Exam::query()->with('creator')->withCount('examQuestions');

        $this->applySearch($query, $dto->search);

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
