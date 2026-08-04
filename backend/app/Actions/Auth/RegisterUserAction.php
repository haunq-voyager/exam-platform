<?php

namespace App\Actions\Auth;

use App\Data\Auth\RegisterDto;
use App\Enums\UserRole;
use App\Models\User;

class RegisterUserAction
{
    public function execute(RegisterDto $dto): array
    {
        $user = User::create([
            'name' => $dto->name,
            'email' => $dto->email,
            'password' => $dto->password,
            'role' => UserRole::Student,
        ]);

        $token = $user->createToken('api')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }
}
