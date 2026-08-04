<?php

namespace App\Actions\Ai;

use App\Models\AiGeneration;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ListAiGenerationsAction
{
    public function execute(int $perPage = 15, int $page = 1): LengthAwarePaginator
    {
        return AiGeneration::query()
            ->with(['teacher', 'subject', 'topic', 'generatedQuestions'])
            ->orderByDesc('created_at')
            ->paginate(perPage: $perPage, page: $page);
    }
}
