# Hệ thống thi trực tuyến tích hợp AI

Đồ án tốt nghiệp: hệ thống thi trực tuyến hỗ trợ AI tạo câu hỏi (Human-in-the-loop) và cảnh báo gian lận qua camera.

- **Backend**: Laravel 13 (PHP 8.4), RESTful API, Sanctum (token auth), Spatie Laravel Data (DTO).
- **Frontend**: Next.js 16 (App Router), TypeScript.
- **Database**: PostgreSQL 16.
- **AI tạo câu hỏi**: kiến trúc provider-agnostic (`AiQuestionGeneratorContract`), hiện dùng **mock provider** để demo luồng duyệt — chưa gọi API AI thật. Đổi sang OpenAI/Gemini chỉ cần thêm Adapter và đổi binding trong `AppServiceProvider`, không phải sửa code nghiệp vụ.
- **Camera proctoring**: frontend xin quyền camera, hiển thị video ngay tại trình duyệt, phát hiện chuyển tab thật (Page Visibility API) + phát sự kiện giả lập định kỳ làm placeholder cho MediaPipe Face Detector sẽ tích hợp sau.

## Chạy bằng Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- PostgreSQL: cổng host `5433` (map vào `5432` trong container, tránh đụng Postgres có sẵn trên máy)

Lần chạy đầu tiên, container `backend` sẽ tự động: sinh `APP_KEY`, chạy `migrate`, và `db:seed` (chỉ seed nếu bảng `users` đang rỗng).

## Tài khoản demo (mật khẩu chung: `password`)

| Vai trò | Email |
|---|---|
| Quản trị viên | admin@example.com |
| Giảng viên | teacher1@example.com, teacher2@example.com |
| Thí sinh | student1@example.com, student2@example.com, student3@example.com |

Đã có sẵn 1 môn học, 1 chủ đề, 10 câu hỏi mẫu, và 1 đề thi demo ("Kiểm tra giữa kỳ - Công nghệ Web", trạng thái *open*) đã gán cho cả 3 thí sinh — có thể đăng nhập và làm bài ngay.

## Cấu trúc thư mục

```
backend/     Laravel API
frontend/    Next.js UI
docker-compose.yml
```

## Phát triển không dùng Docker

Backend (cần PHP 8.4 + Composer + PostgreSQL cục bộ):

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Frontend (cần Node.js 20+):

```bash
cd frontend
npm install
npm run dev
```

Đặt biến môi trường `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:8000/api`) nếu backend chạy ở địa chỉ khác.

## Giới hạn hiện tại (đã ghi nhận trong đề cương)

- AI tạo câu hỏi đang dùng **mock provider**, chưa gọi OpenAI/Gemini thật.
- Camera proctoring mới dừng ở mức plumbing (xin quyền camera, phát/lưu sự kiện, phát hiện chuyển tab thật); chưa gắn mô hình nhận diện khuôn mặt MediaPipe.
- Chưa có test tự động (unit/feature) — theo yêu cầu chỉ tạo khi được yêu cầu rõ.
