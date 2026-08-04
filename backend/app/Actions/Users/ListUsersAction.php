<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ListUsersAction
{
    public function execute(?string $role = null): Collection
    {
        return User::query()
            ->when($role !== null, fn ($query) => $query->where('role', $role))
            ->orderBy('name')
            ->get();
    }
}
