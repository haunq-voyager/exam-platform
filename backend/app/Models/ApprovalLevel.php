<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * One step of the approval chain an exam session goes through before it may be switched on.
 *
 * @property int $id
 * @property int $position
 * @property string $name
 * @property UserRole $role
 * @property string $scope department|global
 * @property bool $is_active
 */
#[Fillable(['position', 'name', 'role', 'scope', 'is_active'])]
class ApprovalLevel extends Model
{
    public const SCOPE_DEPARTMENT = 'department';

    public const SCOPE_GLOBAL = 'global';

    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'is_active' => 'boolean',
        ];
    }

    public function isDepartmentScoped(): bool
    {
        return $this->scope === self::SCOPE_DEPARTMENT;
    }
}
