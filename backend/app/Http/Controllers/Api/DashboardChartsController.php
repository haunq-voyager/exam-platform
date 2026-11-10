<?php

namespace App\Http\Controllers\Api;

use App\Enums\ExamAttemptStatus;
use App\Enums\ExamStatus;
use App\Models\Department;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Services\Approvals\SessionAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Chart data for the staff overview, limited to the exam sessions the user may see and narrowed by the optional
 * filters year, month (of the start time) and department_id.
 */
class DashboardChartsController extends BaseController
{
    private const DEFAULT_MONTHS = 6;

    private const SCORE_BINS = 5;

    public function __construct(private SessionAccess $sessionAccess) {}

    public function __invoke(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);
        $year = isset($filters['year']) ? (int) $filters['year'] : null;
        $month = isset($filters['month']) ? (int) $filters['month'] : null;
        $departmentId = isset($filters['department_id']) ? (int) $filters['department_id'] : null;

        $user = $request->user();
        $visible = fn (Builder $sessions) => $this->sessionAccess->scopeVisible($sessions, $user);
        $inDepartment = function (Builder $sessions) use ($departmentId) {
            if ($departmentId !== null) {
                $sessions->where('department_id', $departmentId);
            }
        };
        // Sessions that match every filter (the period filters leave out sessions that have no start time).
        $matching = function (Builder $sessions) use ($visible, $inDepartment, $year, $month) {
            $visible($sessions);
            $inDepartment($sessions);
            if ($year !== null) {
                $sessions->whereYear('start_at', $year);
            }
            if ($month !== null) {
                $sessions->whereMonth('start_at', $month);
            }
        };

        // Sessions by stage: not yet approved ones are told apart from the ones already on the calendar.
        $stages = array_fill_keys(['draft', 'pending', 'rejected', 'scheduled', 'open', 'closed'], 0);
        ExamSession::query()
            ->tap($matching)
            ->selectRaw('status, approval_status, count(*) as total')
            ->groupBy('status', 'approval_status')
            ->get()
            ->each(function ($row) use (&$stages) {
                $status = $row->status instanceof ExamStatus ? $row->status->value : (string) $row->status;
                $stage = match (true) {
                    $status === ExamStatus::Draft->value && $row->approval_status === 'pending' => 'pending',
                    $status === ExamStatus::Draft->value && $row->approval_status === 'rejected' => 'rejected',
                    default => $status,
                };
                $stages[$stage] = ($stages[$stage] ?? 0) + (int) $row->total;
            });

        // Sessions starting in each month: the 12 months of the chosen year, or the last months when no year is chosen.
        // The month filter does not apply here, this chart is the month breakdown itself.
        $from = $year !== null
            ? now()->setDate($year, 1, 1)->startOfDay()
            : now()->startOfMonth()->subMonths(self::DEFAULT_MONTHS - 1);
        $count = $year !== null ? 12 : self::DEFAULT_MONTHS;
        $perMonth = ExamSession::query()
            ->tap($visible)
            ->tap($inDepartment)
            ->where('start_at', '>=', $from)
            ->where('start_at', '<', $from->copy()->addMonths($count))
            ->selectRaw("to_char(start_at, 'YYYY-MM') as month, count(*) as total")
            ->groupBy('month')
            ->pluck('total', 'month');
        $months = [];
        for ($i = 0; $i < $count; $i++) {
            $key = $from->copy()->addMonths($i)->format('Y-m');
            $months[] = ['month' => $key, 'total' => (int) ($perMonth[$key] ?? 0)];
        }

        // Graded attempts by percentage of the maximum score, in equal bins (0-20 %, 20-40 % ... 80-100 %).
        $perBin = ExamAttempt::query()
            ->where('status', ExamAttemptStatus::Graded)
            ->whereNotNull('score')
            ->where('total_points', '>', 0)
            ->whereHas('session', $matching)
            ->selectRaw('least(floor(score / total_points * '.self::SCORE_BINS.'), '.(self::SCORE_BINS - 1).')::int as bin, count(*) as total')
            ->groupBy('bin')
            ->pluck('total', 'bin');
        $scores = [];
        for ($bin = 0; $bin < self::SCORE_BINS; $bin++) {
            $width = 100 / self::SCORE_BINS;
            $scores[] = ['from' => (int) ($bin * $width), 'to' => (int) (($bin + 1) * $width), 'total' => (int) ($perBin[$bin] ?? 0)];
        }

        // What the filter controls offer: the years that have sessions, and the departments (only for users who are
        // not tied to one department).
        $years = ExamSession::query()
            ->tap($visible)
            ->whereNotNull('start_at')
            ->selectRaw('extract(year from start_at)::int as year')
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->map(fn ($value) => (int) $value)
            ->values();
        $departments = $user->department_id === null
            ? Department::query()->orderBy('name')->get(['id', 'name'])
            : collect();

        return $this->respondSuccess(data: [
            'session_stages' => $stages,
            'sessions_per_month' => $months,
            'score_distribution' => $scores,
            'filters' => ['years' => $years, 'departments' => $departments],
        ], message: 'Dashboard charts retrieved successfully.');
    }
}
