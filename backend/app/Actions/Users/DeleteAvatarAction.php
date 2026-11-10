<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Facades\Storage;

class DeleteAvatarAction
{
    public function execute(User $user): User
    {
        if ($user->avatar_path !== null) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return $user;
    }
}
