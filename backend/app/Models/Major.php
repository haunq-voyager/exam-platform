<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A study programme (ngành) students can be enrolled in. `users.major` keeps the name of the chosen one.
 *
 * @property int $id
 * @property string $name
 */
#[Fillable(['name'])]
class Major extends Model {}
