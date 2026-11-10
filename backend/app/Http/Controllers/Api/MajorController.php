<?php

namespace App\Http\Controllers\Api;

use App\Models\Major;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** The list of ngành behind the dropdown of the user form. */
class MajorController extends BaseController
{
    public function index(): JsonResponse
    {
        return $this->respondSuccess(
            data: Major::query()->orderBy('name')->get(['id', 'name'])->all(),
            message: 'Majors retrieved successfully.',
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['name' => ['required', 'string', 'max:255', 'unique:majors,name']]);
        $major = Major::create(['name' => trim($validated['name'])]);

        return $this->respondSuccess(data: ['id' => $major->id, 'name' => $major->name], message: 'Major created successfully.', status: Response::HTTP_CREATED);
    }
}
