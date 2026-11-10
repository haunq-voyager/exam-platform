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
        $query = User::query()->with('department');

        $this->applySearch($query, $dto->search);

        if ($dto->role !== null && $dto->role !== '') {
            $query->where('role', $dto->role);
        }

        if (filled($dto->department_id)) {
            $query->where('department_id', $dto->department_id);
        }

        if (filled($dto->class_code)) {
            $query->where('class_code', $dto->class_code);
        }

        if (filled($dto->major)) {
            $query->where('major', $dto->major);
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
                ->orWhere('email', 'ILIKE', "%{$keyword}%")
                ->orWhere('user_code', 'ILIKE', "%{$keyword}%")
                ->orWhere('class_code', 'ILIKE', "%{$keyword}%");
        });
    }
}
