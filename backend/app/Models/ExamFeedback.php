<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student's feedback about an exam session / attempt, and the reply of the responsible teacher.
 *
 * @property int $id
 * @property int $exam_session_id
 * @property int|null $exam_attempt_id
 * @property int $student_id
 * @property string $message
 * @property string|null $reply
 * @property int|null $replied_by
 * @property \Illuminate\Support\Carbon|null $replied_at
 */
#[Fillable(['exam_session_id', 'exam_attempt_id', 'student_id', 'message', 'reply', 'replied_by', 'replied_at'])]
class ExamFeedback extends Model
{
    protected $table = 'exam_feedback';

    protected function casts(): array
    {
        return ['replied_at' => 'datetime'];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'exam_session_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function replier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }
}
