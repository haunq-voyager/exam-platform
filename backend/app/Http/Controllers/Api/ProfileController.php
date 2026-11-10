<?php

namespace App\Http\Controllers\Api;

use App\Actions\Users\DeleteAvatarAction;
use App\Actions\Users\UpdateAvatarAction;
use App\Data\Users\UploadAvatarDto;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends BaseController
{
    public function __construct(
        private UpdateAvatarAction $updateAvatarAction,
        private DeleteAvatarAction $deleteAvatarAction,
    ) {}

    public function updateAvatar(UploadAvatarDto $dto, Request $request): JsonResponse
    {
        $user = $this->updateAvatarAction->execute($request->user(), $dto->avatar);

        return $this->respondSuccess(data: UserResource::make($user), message: 'Avatar updated successfully.');
    }

    public function destroyAvatar(Request $request): JsonResponse
    {
        $user = $this->deleteAvatarAction->execute($request->user());

        return $this->respondSuccess(data: UserResource::make($user), message: 'Avatar removed successfully.');
    }
}
