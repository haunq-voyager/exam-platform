<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class UpdateAvatarAction
{
    public function execute(User $user, UploadedFile $avatar): User
    {
        $oldPath = $user->avatar_path;

        // hashName() gives an unguessable, collision-free name, so the original file name is never trusted.
        $path = $avatar->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('public')->delete($oldPath);
        }

        return $user;
    }
}
