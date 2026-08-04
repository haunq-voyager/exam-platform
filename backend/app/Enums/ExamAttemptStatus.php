<?php

namespace App\Enums;

enum ExamAttemptStatus: string
{
    case InProgress = 'in_progress';
    case Submitted = 'submitted';
    case Graded = 'graded';
}
