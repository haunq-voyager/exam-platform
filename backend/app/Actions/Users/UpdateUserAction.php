<?php

namespace App\Actions\Users;

use App\Data\Users\UpdateUserDto;
use App\Models\User;

class UpdateUserAction
{
    public function execute(User $user, UpdateUserDto $dto): User
    {
        $attributes = array_filter([
            'name' => $dto->name,
            'email' => $dto->email,
            'password' => $dto->password,
            'role' => $dto->role,
        ], fn ($value) => $value !== null);

        $user->update($attributes);

        return $user;
    }
}
