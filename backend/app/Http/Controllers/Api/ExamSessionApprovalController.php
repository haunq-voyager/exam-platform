<?php

namespace App\Http\Controllers\Api;

use App\Data\Approvals\RejectApprovalDto;
use App\Data\Approvals\ReviewApprovalDto;
use App\Enums\Permission;
use App\Http\Resources\ExamSessionResource;
use App\Models\ExamSession;
use App\Models\ExamSessionApproval;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamSessionApprovalController extends BaseController
{
    public function __construct(
        private ApprovalService $approvals,
    ) {}

    /** Approval state, history and what the current user may do with this session. */
    public function show(ExamSession $examSession, Request $request): JsonResponse
    {
        return $this->respondSuccess(data: $this->state($examSession, $request->user()), message: 'Approval state retrieved successfully.');
    }

    public function submit(ExamSession $examSession, Request $request): JsonResponse
    {
        $this->approvals->submit($examSession, $request->user());

        return $this->respondSuccess(data: $this->state($examSession->refresh(), $request->user()), message: 'Session sent for approval.');
    }

    public function withdraw(ExamSession $examSession, Request $request): JsonResponse
    {
        $this->approvals->withdraw($examSession, $request->user());

        return $this->respondSuccess(data: $this->state($examSession->refresh(), $request->user()), message: 'Approval request withdrawn.');
    }

    public function approve(ReviewApprovalDto $dto, ExamSession $examSession, Request $request): JsonResponse
    {
        $this->approvals->approve($examSession, $request->user(), $dto->comment);

        return $this->respondSuccess(data: $this->state($examSession->refresh(), $request->user()), message: 'Session approved at this level.');
    }

    public function reject(RejectApprovalDto $dto, ExamSession $examSession, Request $request): JsonResponse
    {
        $this->approvals->reject($examSession, $request->user(), $dto->comment);

        return $this->respondSuccess(data: $this->state($examSession->refresh(), $request->user()), message: 'Session rejected.');
    }

    /**
     * `scope`: awaiting (waiting for my approval) | mine (my sessions that are pending or were sent back)
     * | handled (sessions I approved or rejected).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $scope = (string) $request->query('scope', 'awaiting');

        $query = ExamSession::query()
            ->with(['exam' => fn ($query) => $query->withCount('examQuestions'), 'creator', 'department'])
            ->withCount('assignments');

        match ($scope) {
            'mine' => $query->where('created_by', $user->id)->whereIn('approval_status', [ApprovalService::PENDING, ApprovalService::REJECTED]),
            'handled' => $query->whereHas('approvals', fn ($approvals) => $approvals->where('actor_id', $user->id)->whereIn('action', ['approved', 'rejected'])),
            default => $this->approvals->scopeAwaiting($query, $user),
        };

        $sessions = $query->orderByDesc('approval_submitted_at')->orderByDesc('id')->limit(100)->get();

        return $this->respondSuccess(data: ExamSessionResource::collection($sessions)->resolve(), message: 'Approvals retrieved successfully.');
    }

    /** Numbers for the menu badge. */
    public function counts(Request $request): JsonResponse
    {
        $user = $request->user();

        $awaiting = ExamSession::query();
        $this->approvals->scopeAwaiting($awaiting, $user);

        return $this->respondSuccess(data: [
            'awaiting' => $awaiting->count(),
            'rejected_mine' => ExamSession::query()->where('created_by', $user->id)->where('approval_status', ApprovalService::REJECTED)->count(),
        ], message: 'Approval counts retrieved successfully.');
    }

    /** @return array<string, mixed> */
    private function state(ExamSession $session, User $user): array
    {
        $session->load(['department', 'creator']);
        $levels = $this->approvals->activeLevels();
        $current = $this->approvals->levelFor($session);
        $canUpdate = $user->hasPermission(Permission::SessionsUpdate);

        return [
            'status' => $session->approval_status,
            'required' => $this->approvals->isRequired(),
            'submitted_at' => $session->approval_submitted_at?->toISOString(),
            'approved_at' => $session->approved_at?->toISOString(),
            'department_name' => $session->department?->name,
            'creator_name' => $session->creator?->name,
            'current_level' => $current === null ? null : ['position' => $current->position, 'name' => $current->name],
            // Every level of the chain with where this session currently stands in it.
            'levels' => $levels->map(fn ($level) => [
                'position' => $level->position,
                'name' => $level->name,
                'role_label' => $level->role->label(),
                'scope' => $level->scope,
                'state' => match (true) {
                    $session->approval_status === ApprovalService::APPROVED => 'done',
                    $session->approval_status === ApprovalService::PENDING && $current !== null && $level->position < $current->position => 'done',
                    $session->approval_status === ApprovalService::PENDING && $current?->position === $level->position => 'current',
                    default => 'upcoming',
                },
            ])->values()->all(),
            'can_act' => $this->approvals->canAct($user, $session),
            'can_submit' => $canUpdate && in_array($session->approval_status, [ApprovalService::DRAFT, ApprovalService::REJECTED], true),
            'can_withdraw' => $canUpdate && $session->approval_status === ApprovalService::PENDING,
            'history' => $session->approvals()->with('actor')->get()->map(fn (ExamSessionApproval $entry) => [
                'id' => $entry->id,
                'action' => $entry->action,
                'level_name' => $entry->level_name,
                'actor_name' => $entry->actor?->name,
                'actor_role' => $entry->actor?->role->label(),
                'comment' => $entry->comment,
                'created_at' => $entry->created_at?->toISOString(),
            ])->all(),
        ];
    }
}
