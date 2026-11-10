<?php

namespace App\Actions\Users;

use App\Data\Users\UpdateUserDto;
use App\Models\User;
use Spatie\LaravelData\Optional;

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

        // Sending null clears the value; leaving the field out keeps it.
        if (! $dto->major instanceof Optional) {
            $attributes['major'] = filled($dto->major) ? trim($dto->major) : null;
        }

        if (! $dto->department_id instanceof Optional) {
            $attributes['department_id'] = $dto->department_id;
        }

        foreach (User::PROFILE_FIELDS as $field) {
            if (! $dto->{$field} instanceof Optional) {
                $attributes[$field] = filled($dto->{$field}) ? trim((string) $dto->{$field}) : null;
            }
        }

        $user->update($attributes);

        return $user;
    }
}
