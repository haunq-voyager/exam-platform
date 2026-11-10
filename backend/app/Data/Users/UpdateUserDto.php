<?php

namespace App\Data\Users;

use App\Enums\UserRole;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

class UpdateUserDto extends Data
{
    /**
     * Optional fields use Optional so "not sent" (keep) and `null` (clear the value) can be told apart.
     */
    public function __construct(
        public ?string $name = null,
        public ?string $email = null,
        public ?string $password = null,
        public ?UserRole $role = null,
        public string|Optional|null $major = new Optional(),
        public int|Optional|null $department_id = new Optional(),
        public string|Optional|null $user_code = new Optional(),
        public string|Optional|null $class_code = new Optional(),
        public string|Optional|null $academic_year = new Optional(),
        public int|Optional|null $study_start_year = new Optional(),
        public int|Optional|null $study_end_year = new Optional(),
        public string|Optional|null $date_of_birth = new Optional(),
        public string|Optional|null $gender = new Optional(),
        public string|Optional|null $phone = new Optional(),
        public string|Optional|null $permanent_address = new Optional(),
        public string|Optional|null $temporary_address = new Optional(),
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'nullable', Rule::enum(UserRole::class)],
            'major' => ['sometimes', 'nullable', 'string', 'max:255'],
            'department_id' => ['sometimes', 'nullable', 'integer', 'exists:departments,id'],
            // The route's {user} is the account being edited: it may keep its own code.
            'user_code' => ['sometimes', 'nullable', 'string', 'max:30', Rule::unique('users', 'user_code')->ignore(request()->route('user'))],
            'class_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'academic_year' => ['sometimes', 'nullable', 'string', 'max:30'],
            'study_start_year' => ['sometimes', 'nullable', 'integer', 'between:1950,2100'],
            'study_end_year' => ['sometimes', 'nullable', 'integer', 'between:1950,2100', 'gte:study_start_year'],
            'date_of_birth' => ['sometimes', 'nullable', 'date', 'before:today'],
            'gender' => ['sometimes', 'nullable', Rule::in(['male', 'female', 'other'])],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^[0-9+()\\-.\\s]{8,20}$/'],
            'permanent_address' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'temporary_address' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
