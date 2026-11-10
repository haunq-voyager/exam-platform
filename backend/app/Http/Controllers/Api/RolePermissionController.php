<?php

namespace App\Http\Controllers\Api;

use App\Data\Roles\SyncRolePermissionsDto;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Exceptions\ApiException;
use App\Services\Auth\PermissionService;
use Illuminate\Http\JsonResponse;

/** The permission matrix: which staff role may do what. */
class RolePermissionController extends BaseController
{
    public function __construct(
        private PermissionService $permissions,
    ) {}

    public function index(): JsonResponse
    {
        return $this->respondSuccess(data: $this->matrix(), message: 'Role permissions retrieved successfully.');
    }

    public function update(SyncRolePermissionsDto $dto, string $role): JsonResponse
    {
        $userRole = UserRole::tryFrom($role);
        if ($userRole === null || ! $userRole->isConfigurable()) {
            throw new ApiException('The permissions of this role cannot be changed.', 'roles.not_configurable', 422);
        }

        $this->permissions->sync($userRole, $dto->permissions);

        return $this->respondSuccess(data: $this->matrix(), message: 'Role permissions updated successfully.');
    }

    /** @return array<string, mixed> */
    private function matrix(): array
    {
        return [
            'permissions' => array_map(fn (Permission $permission) => [
                'key' => $permission->value,
                'label' => $permission->label(),
                'group' => $permission->group(),
            ], Permission::cases()),
            'roles' => array_map(fn (UserRole $role) => [
                'key' => $role->value,
                'label' => $role->label(),
                'configurable' => $role->isConfigurable(),
                'permissions' => $this->permissions->permissionsFor($role),
            ], array_values(array_filter(UserRole::cases(), fn (UserRole $role) => $role !== UserRole::Student))),
        ];
    }
}
