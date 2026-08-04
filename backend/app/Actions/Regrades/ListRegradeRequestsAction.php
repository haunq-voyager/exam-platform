<?php

namespace App\Actions\Regrades;

use App\Data\Regrades\ListRegradeRequestsDto;
use App\Models\RegradeRequest;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListRegradeRequestsAction
{
    public function execute(ListRegradeRequestsDto $dto): LengthAwarePaginator
    {
        $query = RegradeRequest::query()->with(['student', 'reviewer', 'attempt.session']);

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
