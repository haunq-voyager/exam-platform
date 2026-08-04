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
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::enum(UserRole::class)],
        ];
    }
}
