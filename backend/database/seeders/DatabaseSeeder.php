<?php

namespace Database\Seeders;

use App\Enums\Difficulty;
use App\Enums\ExamStatus;
use App\Enums\QuestionStatus;
use App\Enums\QuestionType;
use App\Enums\UserRole;
use App\Models\Exam;
use App\Models\Question;
use App\Models\Subject;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $admin = User::create([
            'name' => 'Quản trị viên',
            'email' => 'admin@example.com',
            'password' => 'password',
            'role' => UserRole::Admin,
        ]);

        $teacher = User::create([
            'name' => 'Nguyễn Văn Giảng',
            'email' => 'teacher1@example.com',
            'password' => 'password',
            'role' => UserRole::Teacher,
        ]);

        User::create([
            'name' => 'Trần Thị Dạy',
            'email' => 'teacher2@example.com',
            'password' => 'password',
            'role' => UserRole::Teacher,
        ]);

        $students = collect([
            ['name' => 'Lê Văn Học', 'email' => 'student1@example.com'],
            ['name' => 'Phạm Thị Thi', 'email' => 'student2@example.com'],
            ['name' => 'Hoàng Văn Sinh', 'email' => 'student3@example.com'],
        ])->map(fn (array $attributes) => User::create([
            'name' => $attributes['name'],
            'email' => $attributes['email'],
            'password' => 'password',
            'role' => UserRole::Student,
        ]));

        $subject = Subject::create([
            'name' => 'Công nghệ phần mềm',
            'description' => 'Kiến thức nền tảng về phát triển phần mềm và ứng dụng web.',
        ]);

        $topic = Topic::create([
            'subject_id' => $subject->id,
            'name' => 'Lập trình Web với Laravel & Next.js',
            'description' => 'Kiến trúc RESTful API, xác thực, và xây dựng giao diện người dùng.',
        ]);

        $questionDefinitions = [
            ['text' => 'Laravel là framework được viết bằng ngôn ngữ lập trình nào?', 'options' => ['PHP', 'Python', 'Ruby', 'Java'], 'correct' => ['PHP'], 'difficulty' => Difficulty::Easy],
            ['text' => 'Trong Laravel, thành phần nào chịu trách nhiệm định nghĩa cấu trúc bảng dữ liệu?', 'options' => ['Migration', 'Controller', 'Middleware', 'Resource'], 'correct' => ['Migration'], 'difficulty' => Difficulty::Easy],
            ['text' => 'Middleware trong Laravel thường được dùng để làm gì?', 'options' => ['Lọc và xử lý HTTP request trước khi vào controller', 'Định nghĩa bảng dữ liệu', 'Sinh giao diện HTML', 'Quản lý gói composer'], 'correct' => ['Lọc và xử lý HTTP request trước khi vào controller'], 'difficulty' => Difficulty::Medium],
            ['text' => 'Laravel Sanctum thường được dùng để xử lý nghiệp vụ nào?', 'options' => ['Xác thực API bằng token', 'Gửi email', 'Xử lý hàng đợi', 'Kết nối cơ sở dữ liệu'], 'correct' => ['Xác thực API bằng token'], 'difficulty' => Difficulty::Medium],
            ['text' => 'Next.js là framework front-end dựa trên thư viện nào?', 'options' => ['React', 'Vue', 'Angular', 'Svelte'], 'correct' => ['React'], 'difficulty' => Difficulty::Easy],
            ['text' => 'Trong kiến trúc RESTful API, phương thức HTTP nào thường dùng để tạo mới tài nguyên?', 'options' => ['POST', 'GET', 'DELETE', 'HEAD'], 'correct' => ['POST'], 'difficulty' => Difficulty::Easy],
            ['text' => 'Khi tích hợp AI tạo câu hỏi, mô hình Human-in-the-loop có nghĩa là gì?', 'options' => ['AI đề xuất, con người kiểm duyệt trước khi sử dụng', 'AI tự động quyết định mọi thứ', 'Con người viết toàn bộ câu hỏi', 'AI chỉ chạy khi không có người dùng'], 'correct' => ['AI đề xuất, con người kiểm duyệt trước khi sử dụng'], 'difficulty' => Difficulty::Medium],
            ['text' => 'Hệ thống giám sát camera (proctoring) trong đề tài này xử lý nhận diện khuôn mặt ở đâu?', 'options' => ['Ngay tại trình duyệt của thí sinh', 'Trên máy chủ Laravel', 'Trên máy chủ của bên thứ ba', 'Không xử lý nhận diện khuôn mặt'], 'correct' => ['Ngay tại trình duyệt của thí sinh'], 'difficulty' => Difficulty::Hard],
            ['text' => 'PostgreSQL là loại hệ quản trị cơ sở dữ liệu nào?', 'options' => ['Quan hệ (RDBMS)', 'Đồ thị (Graph)', 'Tài liệu (Document)', 'Key-Value'], 'correct' => ['Quan hệ (RDBMS)'], 'difficulty' => Difficulty::Easy],
            ['text' => 'Việc tách hai pipeline AI (tạo câu hỏi và cảnh báo gian lận) trong đề tài nhằm mục đích chính nào?', 'options' => ['Dễ triển khai, kiểm thử và bảo vệ độc lập', 'Giảm số lượng bảng trong cơ sở dữ liệu', 'Bắt buộc theo yêu cầu của OpenAI', 'Không cho phép sinh viên tuỳ chỉnh'], 'correct' => ['Dễ triển khai, kiểm thử và bảo vệ độc lập'], 'difficulty' => Difficulty::Hard],
        ];

        $questions = collect($questionDefinitions)->map(fn (array $definition) => Question::create([
            'topic_id' => $topic->id,
            'created_by' => $teacher->id,
            'question_text' => $definition['text'],
            'question_type' => QuestionType::SingleChoice,
            'options' => $definition['options'],
            'correct_answer' => $definition['correct'],
            'explanation' => 'Đáp án đúng là: '.$definition['correct'][0].'.',
            'difficulty' => $definition['difficulty'],
            'status' => QuestionStatus::Approved,
        ]));

        $exam = Exam::create([
            'title' => 'Kiểm tra giữa kỳ - Công nghệ Web',
            'description' => 'Đề thi demo phục vụ bảo vệ đồ án tốt nghiệp.',
            'created_by' => $teacher->id,
            'duration_minutes' => 30,
            'shuffle_questions' => true,
            'shuffle_options' => true,
        ]);

        $questions->values()->each(function (Question $question, int $index) use ($exam) {
            $exam->examQuestions()->create([
                'question_id' => $question->id,
                'order' => $index + 1,
                'points' => 1,
            ]);
        });

        $examSession = $exam->sessions()->create([
            'title' => 'Kiểm tra giữa kỳ - Công nghệ Web (Ca 1)',
            'created_by' => $teacher->id,
            'status' => ExamStatus::Open,
            'start_at' => now(),
            'end_at' => now()->addDays(7),
        ]);

        $examSession->teachers()->attach($teacher->id);

        $students->each(fn (User $student) => $examSession->assignments()->create([
            'student_id' => $student->id,
        ]));

        $this->command?->info('Seeded demo accounts (password for all: "password"):');
        $this->command?->info("  Admin:   {$admin->email}");
        $this->command?->info("  Teacher: {$teacher->email}");
        $this->command?->info('  Student: '.$students->pluck('email')->implode(', '));
    }
}
