<?php

namespace App\Data\Roles;

use App\Enums\Permission;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class SyncRolePermissionsDto extends Data
{
    /** @param array<int, string> $permissions */
    public function __construct(
        public array $permissions = [],
    ) {}

    public static function rules(): array
    {
        return [
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::values())],
        ];
    }
}
