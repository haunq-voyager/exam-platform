<?php

namespace App\Actions\Catalog;

use App\Models\Subject;

class DeleteSubjectAction
{
    public function execute(Subject $subject): void
    {
        $subject->delete();
    }
}
