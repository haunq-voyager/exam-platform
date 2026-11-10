<?php

namespace App\Data\Approvals;

use App\Enums\UserRole;
use App\Models\ApprovalLevel;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class ReplaceApprovalLevelsDto extends Data
{
    /** @param array<int, array<string, mixed>> $levels in approval order */
    public function __construct(
        public array $levels = [],
    ) {}

    public static function rules(): array
    {
        $roles = array_map(fn (UserRole $role) => $role->value, array_filter(UserRole::cases(), fn (UserRole $role) => $role->isConfigurable()));

        return [
            'levels' => ['present', 'array', 'max:10'],
            'levels.*.id' => ['nullable', 'integer'],
            'levels.*.name' => ['required', 'string', 'max:255'],
            'levels.*.role' => ['required', Rule::in($roles)],
            'levels.*.scope' => ['required', Rule::in([ApprovalLevel::SCOPE_DEPARTMENT, ApprovalLevel::SCOPE_GLOBAL])],
            'levels.*.is_active' => ['required', 'boolean'],
        ];
    }
}
