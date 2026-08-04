<?php

namespace App\Actions\Auth;

use App\Data\Auth\LoginDto;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class LoginUserAction
{
    public function execute(LoginDto $dto): ?array
    {
        $user = User::where('email', $dto->email)->first();

        if ($user === null || ! Hash::check($dto->password, $user->password)) {
            return null;
        }

        $token = $user->createToken('api')->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }
}
