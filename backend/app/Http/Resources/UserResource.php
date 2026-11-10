<?php

namespace App\Http\Resources;

use App\Services\Approvals\ApprovalService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isSelf = $request->user()?->id === $this->id;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'role_label' => $this->role->label(),
            'major' => $this->major,
            'user_code' => $this->user_code,
            'class_code' => $this->class_code,
            'academic_year' => $this->academic_year,
            'study_start_year' => $this->study_start_year,
            'study_end_year' => $this->study_end_year,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'gender' => $this->gender,
            'phone' => $this->phone,
            'permanent_address' => $this->permanent_address,
            'temporary_address' => $this->temporary_address,
            'department_id' => $this->department_id,
            'department_name' => $this->whenLoaded('department', fn () => $this->department?->name),
            'avatar_url' => $this->avatarUrl(),
            // The signed-in user's own rights drive the menu and buttons of the web app.
            $this->mergeWhen($isSelf, fn () => [
                'permissions' => app(\App\Services\Auth\PermissionService::class)->permissionsFor($this->role),
                'is_approver' => app(ApprovalService::class)->isApprover($this->resource),
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
