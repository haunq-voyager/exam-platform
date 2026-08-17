<?php

namespace App\Http\Controllers\Api;

use App\Actions\Users\CreateUserAction;
use App\Actions\Users\DeleteUserAction;
use App\Actions\Users\ListUsersAction;
use App\Actions\Users\UpdateUserAction;
use App\Data\Users\CreateUserDto;
use App\Data\Users\ListUsersDto;
use App\Data\Users\UpdateUserDto;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class UserController extends BaseController
{
    public function __construct(
        private ListUsersAction $listUsersAction,
        private CreateUserAction $createUserAction,
        private UpdateUserAction $updateUserAction,
        private DeleteUserAction $deleteUserAction,
    ) {}

    public function index(ListUsersDto $dto): JsonResponse
    {
        $users = $this->listUsersAction->execute($dto);

        return $this->respondSuccess(
            data: UserResource::collection($users),
            message: 'Users retrieved successfully.',
        );
    }

    public function store(CreateUserDto $dto): JsonResponse
    {
        $user = $this->createUserAction->execute($dto);

        return $this->respondSuccess(
            data: UserResource::make($user),
            message: 'User created successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function show(User $user): JsonResponse
    {
        return $this->respondSuccess(data: UserResource::make($user), message: 'User retrieved successfully.');
    }

    public function update(UpdateUserDto $dto, User $user): JsonResponse
    {
        $user = $this->updateUserAction->execute($user, $dto);

        return $this->respondSuccess(data: UserResource::make($user), message: 'User updated successfully.');
    }

    public function destroy(User $user): JsonResponse
    {
        $this->deleteUserAction->execute($user);

        return $this->respondSuccess(data: null, message: 'User deleted successfully.', status: Response::HTTP_OK);
    }
}
