<?php

use App\Http\Controllers\Api\AiQuestionGenerationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExamAssignmentController;
use App\Http\Controllers\Api\ExamAttemptController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ExamQuestionController;
use App\Http\Controllers\Api\ProctoringEventController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\StudentExamController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TopicController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    // Admin: user management
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    // Subjects & topics: viewable by any authenticated user, managed by teacher/admin
    Route::apiResource('subjects', SubjectController::class)->only(['index', 'show']);
    Route::apiResource('topics', TopicController::class)->only(['index', 'show']);
    Route::middleware('role:admin,teacher')->group(function () {
        Route::apiResource('subjects', SubjectController::class)->except(['index', 'show']);
        Route::apiResource('topics', TopicController::class)->except(['index', 'show']);
    });

    // Question bank: teacher/admin manage
    Route::middleware('role:admin,teacher')->group(function () {
        Route::apiResource('questions', QuestionController::class);
        Route::post('questions/{question}/approve', [QuestionController::class, 'approve']);
        Route::post('questions/{question}/reject', [QuestionController::class, 'reject']);
    });

    // Exams: teacher/admin manage
    Route::middleware('role:admin,teacher')->group(function () {
        Route::apiResource('exams', ExamController::class);
        Route::post('exams/{exam}/publish', [ExamController::class, 'publish']);
        Route::post('exams/{exam}/close', [ExamController::class, 'close']);

        Route::post('exams/{exam}/questions', [ExamQuestionController::class, 'store']);
        Route::delete('exams/{exam}/questions/{examQuestion}', [ExamQuestionController::class, 'destroy']);

        Route::post('exams/{exam}/assignments', [ExamAssignmentController::class, 'store']);
        Route::delete('exams/{exam}/assignments/{assignment}', [ExamAssignmentController::class, 'destroy']);

        Route::get('exams/{exam}/attempts', [ExamAttemptController::class, 'indexForExam']);
    });

    // Student: browse assigned exams and take attempts
    Route::middleware('role:student')->group(function () {
        Route::get('student/exams', [StudentExamController::class, 'index']);
        Route::post('exams/{exam}/attempts', [ExamAttemptController::class, 'store']);
    });

    Route::get('exam-attempts', [ExamAttemptController::class, 'index']);
    Route::get('exam-attempts/{examAttempt}', [ExamAttemptController::class, 'show']);
    Route::patch('exam-attempts/{examAttempt}/answers', [ExamAttemptController::class, 'saveAnswer']);
    Route::post('exam-attempts/{examAttempt}/submit', [ExamAttemptController::class, 'submit']);

    Route::post('exam-attempts/{examAttempt}/proctoring-events', [ProctoringEventController::class, 'store']);
    Route::middleware('role:admin,teacher')->group(function () {
        Route::get('exam-attempts/{examAttempt}/proctoring-events', [ProctoringEventController::class, 'index']);
    });

    // AI question generation (mock provider — see App\Services\Ai)
    Route::middleware('role:admin,teacher')->group(function () {
        Route::post('ai/question-generations', [AiQuestionGenerationController::class, 'store']);
        Route::get('ai/question-generations/{aiGeneration}', [AiQuestionGenerationController::class, 'show']);
        Route::post('ai/question-generations/{aiGeneration}/approve', [AiQuestionGenerationController::class, 'approve']);
        Route::post('ai/question-generations/{aiGeneration}/reject', [AiQuestionGenerationController::class, 'reject']);
    });
});
