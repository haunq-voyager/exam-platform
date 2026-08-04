<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $exam_session_id
 * @property int $student_id
 * @property-read ExamSession $session
 * @property-read User $student
 */
#[Fillable(['exam_session_id', 'student_id'])]
class ExamSessionAssignment extends Model
{
    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'exam_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
