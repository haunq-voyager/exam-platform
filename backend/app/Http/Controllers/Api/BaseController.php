<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Symfony\Component\HttpFoundation\Response;

abstract class BaseController extends Controller
{
    protected function respondSuccess(
        JsonResource|ResourceCollection|array|null $data,
        string $message,
        int $status = Response::HTTP_OK,
    ): JsonResponse {
        $payload = $data instanceof ResourceCollection
            ? $data->response()->getData(true)
            : ['data' => $data];

        return response()->json(array_merge($payload, ['message' => $message]), $status);
    }

    protected function respondError(
        string $message,
        string $messageCode,
        int $status = Response::HTTP_BAD_REQUEST,
        ?array $errors = null,
    ): JsonResponse {
        $payload = [
            'message' => $message,
            'message_code' => $messageCode,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
