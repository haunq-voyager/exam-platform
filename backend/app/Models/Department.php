<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A faculty (khoa). Teachers, department heads and exam sessions belong to one.
 *
 * @property int $id
 * @property string $name
 * @property string|null $code
 */
#[Fillable(['name', 'code'])]
class Department extends Model
{
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function examSessions(): HasMany
    {
        return $this->hasMany(ExamSession::class);
    }
}
