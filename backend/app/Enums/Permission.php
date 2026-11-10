<?php

namespace App\Enums;

/**
 * Everything a staff role can be allowed to do. The set is fixed in code; which role gets which permission
 * is data (`role_permissions`) and is edited by administrators in the permission matrix.
 *
 * Division of work (defaults): administrators prepare everything (question bank, exams, exam sessions, teachers);
 * teachers work only on the sessions they are assigned to: proctoring, regrading requests, replying to feedback.
 */
enum Permission: string
{
    case UsersView = 'users.view';
    case UsersManage = 'users.manage';
    case DepartmentsManage = 'departments.manage';
    case RolesManage = 'roles.manage';
    case CatalogManage = 'catalog.manage';
    case QuestionsManage = 'questions.manage';
    case ExamsManage = 'exams.manage';
    case SessionsView = 'sessions.view';
    case SessionsViewAll = 'sessions.view_all';
    case SessionsCreate = 'sessions.create';
    case SessionsUpdate = 'sessions.update';
    case SessionsEnable = 'sessions.enable';
    case SessionsProctor = 'sessions.proctor';
    case ResultsView = 'results.view';
    case ProctoringView = 'proctoring.view';
    case RegradesReview = 'regrades.review';
    case FeedbackRespond = 'feedback.respond';

    public function label(): string
    {
        return match ($this) {
            self::UsersView => 'Xem danh sách người dùng',
            self::UsersManage => 'Thêm / sửa / xóa người dùng',
            self::DepartmentsManage => 'Quản lý khoa',
            self::RolesManage => 'Phân quyền & cấu hình cấp duyệt',
            self::CatalogManage => 'Quản lý môn học, chủ đề',
            self::QuestionsManage => 'Ra đề: ngân hàng câu hỏi (kể cả AI)',
            self::ExamsManage => 'Ra đề: đề thi mẫu',
            self::SessionsView => 'Xem kỳ thi của mình / được phân công',
            self::SessionsViewAll => 'Xem tất cả kỳ thi trong khoa (hoặc toàn trường nếu không thuộc khoa)',
            self::SessionsCreate => 'Tạo kỳ thi',
            self::SessionsUpdate => 'Sửa kỳ thi, đề, thí sinh, gán giáo viên, gửi duyệt',
            self::SessionsEnable => 'Bật / tắt kỳ thi đã được duyệt',
            self::SessionsProctor => 'Coi thi: theo dõi thí sinh đang làm bài, hủy bài vi phạm',
            self::ResultsView => 'Xem kết quả và bài làm của thí sinh',
            self::ProctoringView => 'Xem nhật ký giám sát gian lận',
            self::RegradesReview => 'Xử lý yêu cầu phúc khảo',
            self::FeedbackRespond => 'Trả lời phản hồi bài thi của thí sinh',
        };
    }

    public function group(): string
    {
        return match ($this) {
            self::UsersView, self::UsersManage, self::DepartmentsManage, self::RolesManage => 'Quản trị hệ thống',
            self::CatalogManage, self::QuestionsManage, self::ExamsManage => 'Ra đề',
            self::SessionsView, self::SessionsViewAll, self::SessionsCreate, self::SessionsUpdate, self::SessionsEnable => 'Kỳ thi',
            self::SessionsProctor, self::ProctoringView, self::ResultsView, self::RegradesReview, self::FeedbackRespond => 'Coi thi & hậu kiểm',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }

    /**
     * Defaults used when permissions are first created (and by the migration that realigns teachers to this split).
     *
     * @return array<string, array<int, self>>
     */
    public static function defaultsByRole(): array
    {
        return [
            UserRole::Teacher->value => [
                self::SessionsView, self::SessionsProctor, self::ResultsView, self::ProctoringView,
                self::RegradesReview, self::FeedbackRespond,
            ],
            UserRole::DepartmentHead->value => [
                self::UsersView, self::SessionsView, self::SessionsViewAll, self::ResultsView,
            ],
            UserRole::TrainingOffice->value => [
                self::UsersView, self::SessionsView, self::SessionsViewAll, self::ResultsView,
            ],
        ];
    }
}
