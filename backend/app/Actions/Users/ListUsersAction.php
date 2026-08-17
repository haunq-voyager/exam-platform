<?php

namespace App\Actions\Users;

use App\Data\Users\ListUsersDto;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListUsersAction
{
    public function execute(ListUsersDto $dto): LengthAwarePaginator
    {
        $query = User::query();

        $this->applySearch($query, $dto->search);

        if ($dto->role !== null && $dto->role !== '') {
            $query->where('role', $dto->role);
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

        $query->where(function (Builder $query) use ($keyword) {
            $query->where('name', 'ILIKE', "%{$keyword}%")
                ->orWhere('email', 'ILIKE', "%{$keyword}%");
        });
    }
}
