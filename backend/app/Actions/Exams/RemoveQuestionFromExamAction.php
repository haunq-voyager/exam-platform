<?php

namespace App\Actions\Exams;

use App\Models\ExamQuestion;

class RemoveQuestionFromExamAction
{
    public function execute(ExamQuestion $examQuestion): void
    {
        $examQuestion->delete();
    }
}
