<?php

use App\Http\Controllers\Api\AiQuestionGenerationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExamAttemptController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ExamQuestionController;
use App\Http\Controllers\Api\ExamSessionAssignmentController;
use App\Http\Controllers\Api\ExamSessionController;
use App\Http\Controllers\Api\ExamSessionTeacherController;
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
    // User directory: readable by admin/teacher (needed to assign students & teachers to exam sessions),
    // write operations (create/update/delete) restricted to admin.
    Route::middleware('role:admin,teacher')->group(function () {
        Route::apiResource('users', UserController::class)->only(['index', 'show']);
    });
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class)->only(['store', 'update', 'destroy']);
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

    // Exams (reusable templates): teacher/admin manage
    Route::middleware('role:admin,teacher')->group(function () {
        Route::apiResource('exams', ExamController::class);

        Route::post('exams/{exam}/questions', [ExamQuestionController::class, 'store']);
        Route::delete('exams/{exam}/questions/{examQuestion}', [ExamQuestionController::class, 'destroy']);
    });

    // Exam sessions (scheduled instances of an exam): teacher/admin manage
    Route::middleware('role:admin,teacher')->group(function () {
        Route::get('exam-sessions/stats', [ExamSessionController::class, 'stats']);
        Route::apiResource('exam-sessions', ExamSessionController::class)
            ->parameters(['exam-sessions' => 'examSession']);
        Route::post('exam-sessions/{examSession}/publish', [ExamSessionController::class, 'publish']);
        Route::post('exam-sessions/{examSession}/close', [ExamSessionController::class, 'close']);

        Route::post('exam-sessions/{examSession}/assignments', [ExamSessionAssignmentController::class, 'store']);
        Route::delete('exam-sessions/{examSession}/assignments/{assignment}', [ExamSessionAssignmentController::class, 'destroy']);

        Route::post('exam-sessions/{examSession}/teachers', [ExamSessionTeacherController::class, 'store']);
        Route::delete('exam-sessions/{examSession}/teachers/{teacher}', [ExamSessionTeacherController::class, 'destroy']);

        Route::get('exam-sessions/{examSession}/attempts', [ExamAttemptController::class, 'indexForSession']);
    });

    // Student: browse assigned exam sessions and take attempts
    Route::middleware('role:student')->group(function () {
        Route::get('student/exams', [StudentExamController::class, 'index']);
        Route::post('exam-sessions/{examSession}/attempts', [ExamAttemptController::class, 'store']);
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
