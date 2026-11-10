<?php

namespace App\Actions\Users;

use App\Data\Users\CreateUserDto;
use App\Models\User;

class CreateUserAction
{
    public function execute(CreateUserDto $dto): User
    {
        $profile = [];
        foreach (User::PROFILE_FIELDS as $field) {
            $profile[$field] = filled($dto->{$field}) ? trim((string) $dto->{$field}) : null;
        }

        return User::create([
            'name' => $dto->name,
            'email' => $dto->email,
            'password' => $dto->password,
            'role' => $dto->role,
            'major' => filled($dto->major) ? trim($dto->major) : null,
            'department_id' => $dto->department_id,
            ...$profile,
        ]);
    }
}
