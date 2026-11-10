<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One entry of a session's approval history.
 *
 * @property int $id
 * @property int $exam_session_id
 * @property int|null $level_id
 * @property int|null $level_position
 * @property string|null $level_name
 * @property string $action submitted|approved|rejected|withdrawn|reset|auto_approved
 * @property int|null $actor_id
 * @property string|null $comment
 * @property-read User|null $actor
 */
#[Fillable(['exam_session_id', 'level_id', 'level_position', 'level_name', 'action', 'actor_id', 'comment'])]
class ExamSessionApproval extends Model
{
    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'exam_session_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
