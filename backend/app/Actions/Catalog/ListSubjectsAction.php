<?php

namespace App\Actions\Catalog;

use App\Data\Catalog\ListSubjectsDto;
use App\Models\Subject;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListSubjectsAction
{
    public function execute(ListSubjectsDto $dto): LengthAwarePaginator
    {
        $query = Subject::query()->with(['creator', 'updater'])->withCount('topics');

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

        $query->where('name', 'ILIKE', "%{$keyword}%");
    }
}
