<?php

namespace App\Data\Users;

use Illuminate\Validation\Rule;
use App\Enums\UserRole;
use Spatie\LaravelData\Data;

class CreateUserDto extends Data
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
        public UserRole $role,
        public ?string $major = null,
        public ?int $department_id = null,
        public ?string $user_code = null,
        public ?string $class_code = null,
        public ?string $academic_year = null,
        public ?int $study_start_year = null,
        public ?int $study_end_year = null,
        public ?string $date_of_birth = null,
        public ?string $gender = null,
        public ?string $phone = null,
        public ?string $permanent_address = null,
        public ?string $temporary_address = null,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::enum(UserRole::class)],
            'major' => ['nullable', 'string', 'max:255'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'user_code' => ['nullable', 'string', 'max:30', 'unique:users,user_code'],
            'class_code' => ['nullable', 'string', 'max:50'],
            'academic_year' => ['nullable', 'string', 'max:30'],
            'study_start_year' => ['nullable', 'integer', 'between:1950,2100'],
            'study_end_year' => ['nullable', 'integer', 'between:1950,2100', 'gte:study_start_year'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+()\\-.\\s]{8,20}$/'],
            'permanent_address' => ['nullable', 'string', 'max:1000'],
            'temporary_address' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
