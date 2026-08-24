# Hệ thống thi trực tuyến tích hợp AI

Đồ án tốt nghiệp: hệ thống thi trực tuyến hỗ trợ AI tạo câu hỏi (Human-in-the-loop) và cảnh báo gian lận qua camera.

- **Backend**: Laravel 13 (PHP 8.4), RESTful API, Sanctum (token auth), Spatie Laravel Data (DTO).
- **Frontend**: Next.js 16 (App Router), TypeScript.
- **Database**: PostgreSQL 16.
- **AI tạo câu hỏi**: kiến trúc provider-agnostic (`AiQuestionGeneratorContract`). Dùng **Google Gemini** (free tier) khi có `GEMINI_API_KEY`, tự động rơi về **mock provider** nếu không cấu hình key — không cần sửa code nghiệp vụ để bật/tắt.
- **Camera proctoring**: frontend xin quyền camera, phát hiện chuyển tab thật (Page Visibility API), và nhận diện khuôn mặt thật bằng **MediaPipe Face Detector** chạy ngay trên trình duyệt (`no_face`, `multiple_faces`) — chỉ gửi sự kiện cảnh báo về server, không truyền/lưu video.

## Chạy bằng Docker

```bash
cp .env.example .env   # điền GEMINI_API_KEY nếu muốn AI sinh câu hỏi thật (bỏ trống = dùng mock)
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8010/api
- PostgreSQL: cổng host `5433` (map vào `5432` trong container, tránh đụng Postgres có sẵn trên máy)

Lần chạy đầu tiên, container `backend` sẽ tự động: sinh `APP_KEY`, chạy `migrate`, và `db:seed` (chỉ seed nếu bảng `users` đang rỗng).

### Cấu hình AI tạo câu hỏi (Google Gemini)

1. Lấy API key miễn phí tại https://aistudio.google.com/apikey.
2. Đặt `GEMINI_API_KEY=<key>` trong file `.env` ở thư mục gốc (cạnh `docker-compose.yml`) — file này không bị commit.
3. `docker compose up --build` lại để nạp biến môi trường mới. Nếu không đặt key, hệ thống tự dùng mock provider (sinh câu hỏi giả lập để demo luồng duyệt) — không lỗi, không cần đổi code.

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

Đặt biến môi trường `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:8000/api`) nếu backend chạy ở địa chỉ khác. Thêm `GEMINI_API_KEY`/`GEMINI_MODEL` vào `backend/.env` nếu muốn AI sinh câu hỏi thật khi chạy không dùng Docker.

## Giới hạn hiện tại (đã ghi nhận trong đề cương)

- AI tạo câu hỏi gọi Gemini thật khi có key; quota free tier có giới hạn số request/phút — hết quota sẽ trả lỗi rõ ràng cho giảng viên, không tự crash.
- Chưa giới hạn quyền xem log cảnh báo camera theo giảng viên phụ trách kỳ thi cụ thể (hiện mọi admin/teacher đều xem được).
- Chưa có test tự động (unit/feature) — theo yêu cầu chỉ tạo khi được yêu cầu rõ.
