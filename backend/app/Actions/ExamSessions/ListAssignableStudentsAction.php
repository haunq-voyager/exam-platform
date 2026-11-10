<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\ListAssignableStudentsDto;
use App\Enums\UserRole;
use App\Models\ExamSession;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListAssignableStudentsAction
{
    public function execute(ExamSession $session, ListAssignableStudentsDto $dto): LengthAwarePaginator
    {
        return $this->query($session, $dto->search, $dto->major)
            ->orderBy('name')
            ->paginate(perPage: $dto->per_page, page: $dto->page);
    }

    /** Students that are not yet assigned to the session, optionally narrowed by search text and major. */
    public function query(ExamSession $session, ?string $search, ?string $major): Builder
    {
        $query = User::query()
            ->where('role', UserRole::Student)
            ->whereNotIn('id', $session->assignments()->select('student_id'));

        $search = trim((string) $search);
        if ($search !== '') {
            $query->where(function (Builder $query) use ($search) {
                $query->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('email', 'ILIKE', "%{$search}%")
                    ->orWhere('user_code', 'ILIKE', "%{$search}%")
                    ->orWhere('class_code', 'ILIKE', "%{$search}%");
            });
        }

        $major = trim((string) $major);
        if ($major !== '') {
            $query->where('major', $major);
        }

        return $query;
    }
}
