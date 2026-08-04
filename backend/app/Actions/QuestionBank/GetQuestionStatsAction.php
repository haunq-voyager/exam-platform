<?php

namespace App\Actions\QuestionBank;

use App\Models\Question;

class GetQuestionStatsAction
{
    public function execute(): array
    {
        $byStatus = Question::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $byDifficulty = Question::query()->selectRaw('difficulty, count(*) as total')->groupBy('difficulty')->pluck('total', 'difficulty');

        $bySubject = Question::query()
            ->join('topics', 'questions.topic_id', '=', 'topics.id')
            ->join('subjects', 'topics.subject_id', '=', 'subjects.id')
            ->selectRaw('subjects.name as subject_name, count(*) as total')
            ->groupBy('subjects.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return [
            'by_status' => $byStatus,
            'by_difficulty' => $byDifficulty,
            'by_subject' => $bySubject,
        ];
    }
}
