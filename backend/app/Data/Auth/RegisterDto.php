<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Data;

class RegisterDto extends Data
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }
}
