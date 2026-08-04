<?php

namespace App\Actions\QuestionBank;

use App\Data\QuestionBank\ListQuestionsDto;
use App\Models\Question;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListQuestionsAction
{
    private const FILTER_COLUMNS = ['difficulty', 'status'];

    public function execute(ListQuestionsDto $dto): LengthAwarePaginator
    {
        $query = Question::query()->with(['topic', 'creator']);

        $this->applySearch($query, $dto->search);
        $this->applyFilters($query, $dto);

        if ($dto->topic_id !== null) {
            $query->where('topic_id', $dto->topic_id);
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

        $query->where('question_text', 'ILIKE', "%{$keyword}%");
    }

    private function applyFilters(Builder $query, ListQuestionsDto $dto): void
    {
        foreach (self::FILTER_COLUMNS as $column) {
            $value = $dto->{$column};
            if (blank($value)) {
                continue;
            }
            $query->whereIn($column, $value);
        }
    }
}
