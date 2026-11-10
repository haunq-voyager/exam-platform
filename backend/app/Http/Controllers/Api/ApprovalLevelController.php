<?php

namespace App\Http\Controllers\Api;

use App\Data\Approvals\ReplaceApprovalLevelsDto;
use App\Models\ApprovalLevel;
use App\Services\Approvals\ApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ApprovalLevelController extends BaseController
{
    public function __construct(
        private ApprovalService $approvals,
    ) {}

    public function index(): JsonResponse
    {
        return $this->respondSuccess(data: $this->levels(), message: 'Approval levels retrieved successfully.');
    }

    /** Saves the whole chain: entries with an id are updated in place, new ones created, missing ones removed. */
    public function replace(ReplaceApprovalLevelsDto $dto): JsonResponse
    {
        DB::transaction(function () use ($dto) {
            $keptIds = [];

            foreach (array_values($dto->levels) as $index => $input) {
                $attributes = [
                    'position' => $index + 1,
                    'name' => trim($input['name']),
                    'role' => $input['role'],
                    'scope' => $input['scope'],
                    'is_active' => (bool) $input['is_active'],
                ];

                $level = ! empty($input['id']) ? ApprovalLevel::query()->find($input['id']) : null;
                if ($level !== null) {
                    $level->update($attributes);
                } else {
                    $level = ApprovalLevel::create($attributes);
                }
                $keptIds[] = $level->id;
            }

            ApprovalLevel::query()->whereNotIn('id', $keptIds)->delete();
        });

        $this->approvals->forgetLevels();

        return $this->respondSuccess(data: $this->levels(), message: 'Approval levels saved successfully.');
    }

    /** @return array<int, array<string, mixed>> */
    private function levels(): array
    {
        return ApprovalLevel::query()->orderBy('position')->get()->map(fn (ApprovalLevel $level) => [
            'id' => $level->id,
            'position' => $level->position,
            'name' => $level->name,
            'role' => $level->role->value,
            'role_label' => $level->role->label(),
            'scope' => $level->scope,
            'is_active' => $level->is_active,
        ])->all();
    }
}
