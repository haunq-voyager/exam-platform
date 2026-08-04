<?php

namespace App\Actions\Exams;

use App\Models\Exam;

class DeleteExamAction
{
    public function execute(Exam $exam): void
    {
        $exam->delete();
    }
}
