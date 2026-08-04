<?php

namespace App\Http\Controllers\Api;

use App\Actions\Uploads\UploadImageAction;
use App\Data\Uploads\UploadImageDto;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class UploadController extends BaseController
{
    public function __construct(
        private UploadImageAction $uploadImageAction,
    ) {}

    public function storeImage(UploadImageDto $dto): JsonResponse
    {
        $result = $this->uploadImageAction->execute($dto->image);

        return $this->respondSuccess(data: $result, message: 'Image uploaded successfully.', status: Response::HTTP_CREATED);
    }
}
