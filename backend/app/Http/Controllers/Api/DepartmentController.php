<?php

namespace App\Http\Controllers\Api;

use App\Data\Departments\DepartmentDto;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class DepartmentController extends BaseController
{
    public function index(): JsonResponse
    {
        $departments = Department::query()
            ->withCount(['users', 'examSessions'])
            ->orderBy('name')
            ->get()
            ->map(fn (Department $department) => $this->present($department));

        return $this->respondSuccess(data: $departments->all(), message: 'Departments retrieved successfully.');
    }

    public function store(DepartmentDto $dto): JsonResponse
    {
        $department = Department::create(['name' => trim($dto->name), 'code' => filled($dto->code) ? trim($dto->code) : null]);

        return $this->respondSuccess(data: $this->present($department), message: 'Department created successfully.', status: Response::HTTP_CREATED);
    }

    public function update(DepartmentDto $dto, Department $department): JsonResponse
    {
        $department->update(['name' => trim($dto->name), 'code' => filled($dto->code) ? trim($dto->code) : null]);

        return $this->respondSuccess(data: $this->present($department->loadCount(['users', 'examSessions'])), message: 'Department updated successfully.');
    }

    public function destroy(Department $department): JsonResponse
    {
        // Users and sessions keep working: their department simply becomes empty.
        $department->delete();

        return $this->respondSuccess(data: null, message: 'Department deleted successfully.');
    }

    /** @return array<string, mixed> */
    private function present(Department $department): array
    {
        return [
            'id' => $department->id,
            'name' => $department->name,
            'code' => $department->code,
            'users_count' => $department->users_count ?? null,
            'sessions_count' => $department->exam_sessions_count ?? null,
        ];
    }
}
