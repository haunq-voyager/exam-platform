<?php

namespace App\Actions\Users;

use App\Data\Users\CreateUserDto;
use App\Models\User;

class CreateUserAction
{
    public function execute(CreateUserDto $dto): User
    {
        return User::create([
            'name' => $dto->name,
            'email' => $dto->email,
            'password' => $dto->password,
            'role' => $dto->role,
        ]);
    }
}
