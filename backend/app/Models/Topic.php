<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $subject_id
 * @property string $name
 * @property string|null $description
 * @property string|null $image_path
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property-read Subject $subject
 * @property-read User|null $creator
 * @property-read User|null $updater
 */
#[Fillable(['subject_id', 'name', 'description', 'image_path', 'created_by', 'updated_by'])]
class Topic extends Model
{
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
