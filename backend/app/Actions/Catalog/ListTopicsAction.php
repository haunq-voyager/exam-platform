<?php

namespace App\Actions\Catalog;

use App\Data\Catalog\ListTopicsDto;
use App\Models\Topic;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListTopicsAction
{
    public function execute(ListTopicsDto $dto): LengthAwarePaginator
    {
        $query = Topic::query()->with(['subject', 'creator', 'updater'])->withCount('questions');

        $this->applySearch($query, $dto->search);

        if ($dto->subject_id !== null) {
            $query->where('subject_id', $dto->subject_id);
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

        $query->where('name', 'ILIKE', "%{$keyword}%");
    }
}
