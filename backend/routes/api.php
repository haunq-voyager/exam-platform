<?php

use App\Http\Controllers\Api\AiQuestionGenerationController;
use App\Http\Controllers\Api\ApprovalLevelController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardChartsController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\ExamAttemptController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\ExamFeedbackController;
use App\Http\Controllers\Api\ExamQuestionController;
use App\Http\Controllers\Api\ExamSessionApprovalController;
use App\Http\Controllers\Api\ExamSessionAssignmentController;
use App\Http\Controllers\Api\ExamSessionController;
use App\Http\Controllers\Api\ExamSessionExamController;
use App\Http\Controllers\Api\ExamSessionTeacherController;
use App\Http\Controllers\Api\ProctoringEventController;
use App\Http\Controllers\Api\ProctorController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\RegradeRequestController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\StudentExamController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\TopicController;
use App\Http\Controllers\Api\MailTemplateController;
use App\Http\Controllers\Api\MajorController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WorkloadController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Access is decided by permissions (see App\Enums\Permission), which administrators assign to roles in the
// permission matrix. Admins implicitly have every permission; students have none.
Route::middleware('auth:sanctum')->group(function () {
    // Own profile picture (any role)
    Route::post('me/avatar', [ProfileController::class, 'updateAvatar']);
    Route::delete('me/avatar', [ProfileController::class, 'destroyAvatar']);

    // User directory
    Route::middleware('permission:users.view,users.manage')->group(function () {
        Route::get('users/majors', [UserController::class, 'majors']);
        Route::get('majors', [MajorController::class, 'index']);
        Route::apiResource('users', UserController::class)->only(['index', 'show']);
    });
    Route::middleware('permission:users.manage')->group(function () {
        Route::apiResource('users', UserController::class)->only(['store', 'update', 'destroy']);
        Route::post('majors', [MajorController::class, 'store']);
    });

    // Departments (khoa): the list is needed by pickers everywhere, changes need departments.manage
    Route::middleware('permission:users.view,users.manage,sessions.view,sessions.create,sessions.update,departments.manage')->group(function () {
        Route::get('departments', [DepartmentController::class, 'index']);
        Route::get('approval-levels', [ApprovalLevelController::class, 'index']);
    });
    Route::middleware('permission:departments.manage')->group(function () {
        Route::post('departments', [DepartmentController::class, 'store']);
        Route::put('departments/{department}', [DepartmentController::class, 'update']);
        Route::delete('departments/{department}', [DepartmentController::class, 'destroy']);
    });

    // Permission matrix and approval chain
    Route::middleware('permission:roles.manage')->group(function () {
        Route::get('roles/permissions', [RolePermissionController::class, 'index']);
        Route::put('roles/{role}/permissions', [RolePermissionController::class, 'update']);
        Route::put('approval-levels', [ApprovalLevelController::class, 'replace']);

        // Emails the system sends (wording and look are edited here)
        Route::get('mail-templates', [MailTemplateController::class, 'index']);
        Route::put('mail-templates/{mailTemplate}', [MailTemplateController::class, 'update']);
        Route::post('mail-templates/{mailTemplate}/preview', [MailTemplateController::class, 'preview']);
        Route::post('mail-templates/{mailTemplate}/test', [MailTemplateController::class, 'sendTest']);
        Route::post('mail-templates/{mailTemplate}/reset', [MailTemplateController::class, 'reset']);
    });

    // The bell: every signed-in user reads and clears their own notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // Subjects & topics: viewable by any authenticated user
    Route::apiResource('subjects', SubjectController::class)->only(['index', 'show']);
    Route::apiResource('topics', TopicController::class)->only(['index', 'show']);
    Route::middleware('permission:catalog.manage')->group(function () {
        Route::apiResource('subjects', SubjectController::class)->except(['index', 'show']);
        Route::apiResource('topics', TopicController::class)->except(['index', 'show']);
    });

    // Question bank (and the AI generator that feeds it)
    Route::middleware('permission:questions.manage')->group(function () {
        Route::apiResource('questions', QuestionController::class);
        Route::post('questions/{question}/approve', [QuestionController::class, 'approve']);
        Route::post('questions/{question}/reject', [QuestionController::class, 'reject']);

        Route::post('ai/question-generations', [AiQuestionGenerationController::class, 'store']);
        Route::get('ai/question-generations/{aiGeneration}', [AiQuestionGenerationController::class, 'show']);
        Route::post('ai/question-generations/{aiGeneration}/approve', [AiQuestionGenerationController::class, 'approve']);
        Route::post('ai/question-generations/{aiGeneration}/reject', [AiQuestionGenerationController::class, 'reject']);
    });

    // Exams (reusable templates)
    Route::middleware('permission:exams.manage')->group(function () {
        Route::apiResource('exams', ExamController::class);

        Route::post('exams/{exam}/questions', [ExamQuestionController::class, 'store']);
        Route::delete('exams/{exam}/questions/{examQuestion}', [ExamQuestionController::class, 'destroy']);
    });

    // Exam sessions: viewing (own / department / assigned / awaiting my approval, see SessionAccess)
    Route::middleware('permission:sessions.view,sessions.create,sessions.update')->group(function () {
        Route::get('exam-sessions/stats', [ExamSessionController::class, 'stats']);
        Route::get('exam-sessions', [ExamSessionController::class, 'index']);

        Route::middleware('session.access')->group(function () {
            Route::get('exam-sessions/{examSession}', [ExamSessionController::class, 'show']);
            Route::get('exam-sessions/{examSession}/exam', [ExamSessionExamController::class, 'show']);
            Route::get('exam-sessions/{examSession}/approval', [ExamSessionApprovalController::class, 'show']);
        });

        // Approvers act on sessions by their place in the approval chain, not by a permission.
        Route::get('approvals', [ExamSessionApprovalController::class, 'index']);
        Route::get('approvals/counts', [ExamSessionApprovalController::class, 'counts']);
        Route::middleware('session.access')->group(function () {
            Route::post('exam-sessions/{examSession}/approval/approve', [ExamSessionApprovalController::class, 'approve']);
            Route::post('exam-sessions/{examSession}/approval/reject', [ExamSessionApprovalController::class, 'reject']);
        });
    });

    Route::middleware('permission:sessions.create')->group(function () {
        Route::post('exam-sessions', [ExamSessionController::class, 'store']);
    });

    // Exam sessions: changing them (content, schedule, students, teachers) and sending them for approval
    Route::middleware(['permission:sessions.update', 'session.access'])->group(function () {
        Route::patch('exam-sessions/{examSession}', [ExamSessionController::class, 'update']);
        Route::put('exam-sessions/{examSession}', [ExamSessionController::class, 'update']);
        Route::delete('exam-sessions/{examSession}', [ExamSessionController::class, 'destroy']);

        Route::get('exam-sessions/{examSession}/assignable-students', [ExamSessionAssignmentController::class, 'candidates']);
        Route::post('exam-sessions/{examSession}/assignments/bulk', [ExamSessionAssignmentController::class, 'bulkStore']);
        Route::post('exam-sessions/{examSession}/assignments', [ExamSessionAssignmentController::class, 'store']);
        Route::delete('exam-sessions/{examSession}/assignments/{assignment}', [ExamSessionAssignmentController::class, 'destroy']);

        // Exam content of one session (copy-on-write for shared templates, frozen after the first attempt).
        Route::patch('exam-sessions/{examSession}/exam', [ExamSessionExamController::class, 'update']);
        Route::post('exam-sessions/{examSession}/exam/questions', [ExamSessionExamController::class, 'addQuestions']);
        Route::put('exam-sessions/{examSession}/exam/question-order', [ExamSessionExamController::class, 'reorder']);
        Route::patch('exam-sessions/{examSession}/exam/questions/{examQuestion}', [ExamSessionExamController::class, 'updateQuestion']);
        Route::delete('exam-sessions/{examSession}/exam/questions/{examQuestion}', [ExamSessionExamController::class, 'removeQuestion']);

        Route::post('exam-sessions/{examSession}/teachers', [ExamSessionTeacherController::class, 'store']);
        Route::delete('exam-sessions/{examSession}/teachers/{teacher}', [ExamSessionTeacherController::class, 'destroy']);

        Route::post('exam-sessions/{examSession}/approval/submit', [ExamSessionApprovalController::class, 'submit']);
        Route::post('exam-sessions/{examSession}/approval/withdraw', [ExamSessionApprovalController::class, 'withdraw']);
    });

    // Exam sessions: switching on/off (switching on also requires the approval to be complete)
    Route::middleware(['permission:sessions.enable', 'session.access'])->group(function () {
        Route::post('exam-sessions/{examSession}/publish', [ExamSessionController::class, 'publish']);
        Route::post('exam-sessions/{examSession}/close', [ExamSessionController::class, 'close']);
    });

    // Exam sessions: results of the students
    Route::middleware(['permission:results.view', 'session.access'])->group(function () {
        Route::get('exam-sessions/{examSession}/attempts', [ExamAttemptController::class, 'indexForSession']);
        Route::get('exam-sessions/{examSession}/results', [ExamAttemptController::class, 'resultsForSession']);
    });

    // Proctoring (coi thi): live view of a session the user is assigned to, and manual cancellation of an attempt
    Route::middleware(['permission:sessions.proctor', 'session.access'])->group(function () {
        Route::get('exam-sessions/{examSession}/monitor', [ProctorController::class, 'monitor']);
    });
    Route::middleware('permission:sessions.proctor')->group(function () {
        Route::post('exam-attempts/{examAttempt}/proctor-cancel', [ProctorController::class, 'cancel']);
    });

    // Regrading requests (phúc khảo): students ask, the teachers of the session decide
    Route::middleware('permission:regrades.review')->group(function () {
        Route::get('regrade-requests', [RegradeRequestController::class, 'index']);
        Route::post('regrade-requests/{regradeRequest}/review', [RegradeRequestController::class, 'review']);
    });

    // Feedback about exams (phản hồi bài thi): students write, the teachers of the session reply
    Route::middleware('permission:feedback.respond')->group(function () {
        Route::get('feedback', [ExamFeedbackController::class, 'index']);
        Route::post('feedback/{feedback}/reply', [ExamFeedbackController::class, 'reply']);
    });

    // What needs attention right now (menu badges / dashboard)
    Route::middleware('permission:sessions.view,sessions.proctor,regrades.review,feedback.respond')->group(function () {
        Route::get('workload', WorkloadController::class);
        Route::get('dashboard/charts', DashboardChartsController::class);
    });

    // Student: browse assigned exam sessions and take attempts
    Route::middleware('role:student')->group(function () {
        Route::get('student/exams', [StudentExamController::class, 'index']);
        Route::post('exam-sessions/{examSession}/attempts', [ExamAttemptController::class, 'store']);

        Route::post('regrade-requests', [RegradeRequestController::class, 'store']);
        Route::get('regrade-requests/mine', [RegradeRequestController::class, 'mine']);
        Route::post('exam-sessions/{examSession}/feedback', [ExamFeedbackController::class, 'store']);
        Route::get('feedback/mine', [ExamFeedbackController::class, 'mine']);
    });

    Route::get('exam-attempts', [ExamAttemptController::class, 'index']);
    Route::get('exam-attempts/{examAttempt}', [ExamAttemptController::class, 'show']);
    Route::patch('exam-attempts/{examAttempt}/answers', [ExamAttemptController::class, 'saveAnswer']);
    Route::post('exam-attempts/{examAttempt}/submit', [ExamAttemptController::class, 'submit']);

    Route::post('exam-attempts/{examAttempt}/proctoring-events', [ProctoringEventController::class, 'store']);
    Route::middleware('permission:proctoring.view')->group(function () {
        Route::get('exam-attempts/{examAttempt}/proctoring-events', [ProctoringEventController::class, 'index']);
    });
});
