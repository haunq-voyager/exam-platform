<?php

namespace App\Http\Controllers\Api;

use App\Actions\Auth\LoginUserAction;
use App\Actions\Auth\RegisterUserAction;
use App\Data\Auth\LoginDto;
use App\Data\Auth\RegisterDto;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends BaseController
{
    public function __construct(
        private RegisterUserAction $registerUserAction,
        private LoginUserAction $loginUserAction,
    ) {}

    public function register(RegisterDto $dto): JsonResponse
    {
        $result = $this->registerUserAction->execute($dto);

        return $this->respondSuccess(
            data: ['user' => UserResource::make($result['user']), 'token' => $result['token']],
            message: 'Registered successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function login(LoginDto $dto): JsonResponse
    {
        $result = $this->loginUserAction->execute($dto);

        if ($result === null) {
            return $this->respondError(
                message: 'The provided credentials are incorrect.',
                messageCode: 'auth.invalid_credentials',
                status: Response::HTTP_UNAUTHORIZED,
            );
        }

        return $this->respondSuccess(
            data: ['user' => UserResource::make($result['user']), 'token' => $result['token']],
            message: 'Logged in successfully.',
            status: Response::HTTP_OK,
        );
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->respondSuccess(data: null, message: 'Logged out successfully.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->respondSuccess(data: UserResource::make($request->user()), message: 'Current user retrieved successfully.');
    }
}
