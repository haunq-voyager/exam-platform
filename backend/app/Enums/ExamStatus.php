<?php

namespace App\Enums;

enum ExamStatus: string
{
    case Draft = 'draft';
    case Scheduled = 'scheduled';
    case Open = 'open';
    case Closed = 'closed';
}
