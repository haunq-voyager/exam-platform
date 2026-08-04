<?php

namespace App\Data\Users;

use App\Enums\UserRole;
use Illuminate\Validation\Rule;
use Spatie\LaravelData\Data;

class UpdateUserDto extends Data
{
    public function __construct(
        public ?string $name = null,
        public ?string $email = null,
        public ?string $password = null,
        public ?UserRole $role = null,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'nullable', Rule::enum(UserRole::class)],
        ];
    }
}
