<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property UserRole $role
 * @property string|null $major
 * @property string|null $user_code
 * @property string|null $class_code
 * @property string|null $academic_year
 * @property \Illuminate\Support\Carbon|null $date_of_birth
 * @property string|null $gender
 * @property string|null $phone
 * @property string|null $permanent_address
 * @property string|null $temporary_address
 * @property int|null $study_start_year
 * @property int|null $study_end_year
 * @property int|null $department_id
 * @property string|null $avatar_path
 * @property-read Department|null $department
 */
#[Fillable(['name', 'email', 'password', 'role', 'major', 'department_id', 'avatar_path', 'user_code', 'class_code', 'academic_year', 'date_of_birth', 'gender', 'phone', 'permanent_address', 'temporary_address', 'study_start_year', 'study_end_year'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /** Basic profile columns that are edited together with the account (all optional). */
    public const PROFILE_FIELDS = ['user_code', 'class_code', 'academic_year', 'study_start_year', 'study_end_year', 'date_of_birth', 'gender', 'phone', 'permanent_address', 'temporary_address'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'date_of_birth' => 'date',
            'study_start_year' => 'integer',
            'study_end_year' => 'integer',
        ];
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    public function department(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path !== null ? Storage::disk('public')->url($this->avatar_path) : null;
    }

    public function hasPermission(\App\Enums\Permission|string $permission): bool
    {
        return app(\App\Services\Auth\PermissionService::class)->has($this, $permission);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isTeacher(): bool
    {
        return $this->role === UserRole::Teacher;
    }

    public function isStudent(): bool
    {
        return $this->role === UserRole::Student;
    }
}
