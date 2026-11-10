<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $type
 * @property string $title
 * @property string|null $body
 * @property string|null $url
 * @property array|null $data
 * @property string|null $dedupe_key
 * @property \Illuminate\Support\Carbon|null $read_at
 * @property string|null $email_status pending|sent|failed
 */
#[Fillable(['user_id', 'type', 'title', 'body', 'url', 'data', 'dedupe_key', 'read_at', 'email_status'])]
class Notification extends Model
{
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
