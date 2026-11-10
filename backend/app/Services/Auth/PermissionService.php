<?php

namespace App\Services\Auth;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Answers "may this user do X". Admins always may; students never; every other role gets exactly what the
 * permission matrix (`role_permissions`) grants it.
 */
class PermissionService
{
    /** @var array<string, array<int, string>>|null */
    private ?array $byRole = null;

    /** @return array<int, string> */
    public function permissionsFor(UserRole $role): array
    {
        if ($role === UserRole::Admin) {
            return Permission::values();
        }

        if ($role === UserRole::Student) {
            return [];
        }

        $this->byRole ??= DB::table('role_permissions')
            ->get()
            ->groupBy('role')
            ->map(fn ($rows) => $rows->pluck('permission')->all())
            ->all();

        return $this->byRole[$role->value] ?? [];
    }

    public function has(User $user, Permission|string $permission): bool
    {
        $value = $permission instanceof Permission ? $permission->value : $permission;

        return in_array($value, $this->permissionsFor($user->role), true);
    }

    /**
     * Replaces the permissions of one configurable role.
     *
     * @param  array<int, string>  $permissions
     */
    public function sync(UserRole $role, array $permissions): void
    {
        $valid = array_values(array_intersect(array_unique($permissions), Permission::values()));

        DB::transaction(function () use ($role, $valid) {
            DB::table('role_permissions')->where('role', $role->value)->delete();

            if ($valid !== []) {
                DB::table('role_permissions')->insert(array_map(fn (string $permission) => [
                    'role' => $role->value,
                    'permission' => $permission,
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $valid));
            }
        });

        $this->byRole = null;
    }
}
