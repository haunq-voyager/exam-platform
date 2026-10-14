# Kế hoạch triển khai — Hệ thống thi trực tuyến tích hợp AI

Nguồn: `DECUONGKLTN_THI_TRUC_TUYEN_AI.docx` (đề tài: *Xây dựng hệ thống thi trực tuyến tích hợp AI hỗ trợ tạo câu hỏi và cảnh báo gian lận qua camera*).
Thời gian thực hiện theo đề cương: 01/08/2026 – 15/10/2026 (~10 tuần). Sinh viên: Ngô Quang Hậu – 25550010. GVHD: ThS. Võ Tấn Khoa.

## 0. Hiện trạng repo (đã có, không làm lại)

- Backend Laravel 13 (PHP 8.4), kiến trúc Controller - Action - DTO - Resource, Sanctum auth, PostgreSQL.
- Frontend Next.js 16 (App Router) + TypeScript.
- Module nghiệp vụ cốt lõi: user/role, question bank, đề thi (mẫu) tách khỏi kỳ thi (lịch mở cụ thể), làm bài, chấm điểm — kèm seeder demo.
- Module AI (`app/Actions/Ai`, `AiQuestionGeneratorContract`) hỗ trợ 2 provider thật: **Anthropic Claude** (ưu tiên, `ClaudeAiQuestionGeneratorAdapter`, ép JSON qua tool-use — chưa test được vì tài khoản Anthropic của người dùng chưa nạp credit, trả lỗi rõ ràng chứ không crash) và **Google Gemini** (`GeminiAiQuestionGeneratorAdapter`, ép JSON qua `responseSchema`), tự động rơi về **mock provider** nếu không cấu hình key nào.
- **Đã test thành công end-to-end với Gemini thật**: sinh 3 câu hỏi tiếng Việt đúng chủ đề (single_choice + multiple_choice), giảng viên duyệt, câu hỏi vào ngân hàng câu hỏi với `source: ai`. Model dùng: `gemini-3.5-flash` (không dùng `gemini-flash-latest` vì hay bị 503 quá tải, không dùng `gemini-2.5-flash` vì Google đã deprecate cho tài khoản mới).
- Lưu ý tài khoản Google Workspace for Education (email trường) bị chặn 403 ở toàn bộ model Gemini đời mới do policy tổ chức — phải dùng Gmail cá nhân mới tạo key hoạt động được.
- Module Proctoring (`ProctoringEvent`, `ProctoringSession`) — backend có API ghi/xem sự kiện; frontend xin quyền camera, phát hiện chuyển tab thật qua Page Visibility API, và **face detection đã tích hợp MediaPipe Face Detector thật** (BlazeFace chạy trên trình duyệt) thay cho event giả lập trước đây.
- Docker compose chạy được toàn hệ thống (đã test end-to-end qua curl: đăng nhập, tạo/mở kỳ thi, thí sinh làm bài, nộp bài, chấm điểm, ghi/xem cảnh báo camera).
- **Đã sửa một lỗi kiến trúc nghiêm trọng có sẵn từ đầu dự án**: routes/api.php và model `ExamAttempt` vẫn ở thiết kế cũ (1 bảng `Exam` duy nhất) trong khi phần còn lại của backend (`ExamSessionController` và các Actions liên quan) đã được thiết kế lại theo hướng tách `Exam` (đề thi mẫu, tái sử dụng) / `ExamSession` (kỳ thi — một lần mở đề thi mẫu theo lịch cụ thể, đúng thuật ngữ "đề thi"/"kỳ thi" trong đề cương) nhưng chưa đấu nối xong — khiến toàn bộ luồng thi (bắt đầu làm bài, nộp bài, xem kết quả) bị gãy. Đã sửa `routes/api.php`, model `ExamAttempt`, và viết lại toàn bộ giao diện quản lý đề thi/kỳ thi phía admin/giảng viên (`/dashboard/exams` cho đề thi mẫu, `/dashboard/exam-sessions` mới cho quản lý kỳ thi/lịch/gán thí sinh/giảng viên) cho khớp.

=> Việc còn lại tập trung vào: (1) tích hợp AI thật, (2) kiểm thử tự động (hiện chưa có test case thật ngoài file mẫu mặc định của Laravel), (3) bảo mật/riêng tư — trong đó có việc giới hạn quyền xem log cảnh báo camera theo giảng viên phụ trách kỳ thi đó thay vì mọi giảng viên (hiện mọi tài khoản admin/teacher đều xem được, nhất quán với cách `ShowExamAttemptAction` đang xử lý nhưng chưa chặt theo đề cương), (4) đánh giá hiệu quả, (5) viết báo cáo + demo.

## 1. Giai đoạn 1 (Tuần 1–4): Hoàn thiện đề cương, kiến trúc, nghiệp vụ nền tảng

- [ ] Rà soát và chốt thiết kế CSDL PostgreSQL: user, ngân hàng câu hỏi, đề thi, kỳ thi, lượt làm bài, kết quả, `ai_generations`, `ai_generated_questions`, `proctoring_sessions`, `proctoring_events` (đối chiếu migration hiện có với bảng thiết kế trong đề cương, bổ sung cột còn thiếu: `risk_score`, `metadata`,...).
- [ ] Rà soát API chính (đã có) theo bảng endpoint AI trong đề cương — đảm bảo đủ:
  - `POST /api/ai/question-generations`
  - `GET /api/ai/question-generations/{id}`
  - `POST /api/ai/question-generations/{id}/approve`
  - `POST /api/ai/question-generations/{id}/reject`
  - `POST/GET /api/exam-attempts/{id}/proctoring-events`
- [ ] Xác nhận phân quyền theo vai trò (admin/giảng viên/thí sinh) đã áp dụng đủ trên các route trên.
- [ ] Hoàn thiện giao diện theo vai trò còn thiếu (nếu có) trên Next.js App Router.

## 2. Giai đoạn 2 (Tuần 5–8): Tích hợp AI thật + Camera proctoring thật

### 2.1 Tích hợp AI tạo câu hỏi (LLM thật)
- [x] Viết Adapter mới `GeminiAiQuestionGeneratorAdapter` implement `AiQuestionGeneratorContract`, gọi Google Gemini API (free tier).
- [x] Prompt engineering: dùng `generationConfig.responseSchema` của Gemini để ép output JSON đúng cấu trúc (question_text, question_type, options, correct_answer, explanation, difficulty), validate/lọc lại kết quả phía backend trước khi lưu.
- [x] Gộp N câu hỏi/lần gọi (`question_count`, tối đa 10 theo `CreateAiGenerationDto`) trong một request Gemini duy nhất để tiết kiệm quota.
- [x] API key đọc từ `GEMINI_API_KEY` (biến môi trường backend / `config/services.php`), không lộ xuống frontend.
- [x] `AppServiceProvider` bind theo điều kiện: có `GEMINI_API_KEY` → dùng Gemini thật; không có → tự rơi về mock, không sửa code nghiệp vụ.
- [x] Câu hỏi AI sinh ra luôn ở trạng thái `pending` (chờ giảng viên duyệt) — không đổi so với luồng cũ.
- [ ] **Cần người dùng cung cấp `GEMINI_API_KEY` thật để kiểm thử lời gọi Gemini thực tế** — đã test bằng curl xác nhận binding mock hoạt động đúng khi chưa có key; chưa test được lời gọi Gemini thật vì không có key để thử.

### 2.2 Cảnh báo gian lận qua camera (MediaPipe thật)
- [x] Tích hợp MediaPipe Face Detector chạy trên trình duyệt (Next.js), thay thế event giả lập hiện tại (`frontend/lib/face-detector.ts`).
- [x] Sinh sự kiện cảnh báo thật: `no_face`, `multiple_faces`, `face_out_of_frame` (yêu cầu 2 lần kiểm tra liên tiếp trùng kết quả + cooldown 20s/loại để tránh nhiễu), kết hợp `tab_switch` đã có qua Page Visibility API. `face_out_of_frame` dùng heuristic bounding box chạm mép khung hình (margin 3%) vì MediaPipe chỉ trả về phần khuôn mặt nhìn thấy được, không thể đo trực tiếp phần "nằm ngoài khung" như mô tả ban đầu trong đề cương (30% diện tích) — cần cập nhật lại đề cương cho khớp cơ chế thật này.
- [x] Chỉ gửi sự kiện cảnh báo (metadata) về server qua API đã có, không truyền/lưu video liên tục.
- [x] Thông báo rõ ràng cho thí sinh về việc sử dụng camera trước khi vào phòng thi: màn hình đồng ý bắt buộc (chặn trước khi camera bật) tại `frontend/app/exam/[attemptId]/page.tsx`.
- [x] Giới hạn quyền xem `proctoring_events` — đơn giản hoá theo quyết định của người dùng: **chỉ admin** được xem (không phải mọi teacher, cũng không scope theo giảng viên phụ trách kỳ thi). Route `exam-attempts/{id}/proctoring-events` đổi middleware `role:admin,teacher` → `role:admin`; trang `/dashboard/attempts/[id]` hiển thị thông báo "chỉ quản trị viên" cho giảng viên thay vì bị treo loading.

## 3. Giai đoạn 3 (Tuần 9–10): Kiểm thử, tối ưu, báo cáo

### 3.1 Kiểm thử hệ thống
- **Bỏ qua theo quyết định của người dùng**: không viết test tự động (unit/feature). Kiểm thử các luồng chính (nghiệp vụ, AI, camera, giao diện theo vai trò) thực hiện thủ công qua demo, không viết thành test case.

### 3.2 Đánh giá hiệu quả (phục vụ báo cáo)
- [ ] AI tạo câu hỏi: tỷ lệ câu hỏi được giảng viên chấp nhận, số câu cần chỉnh sửa, độ phù hợp chủ đề.
- [ ] Camera proctoring: độ chính xác ghi nhận các tình huống demo chuẩn.
- [ ] Trải nghiệm: thời gian sinh câu hỏi, thời gian phản hồi UI, ảnh hưởng của xử lý camera khi làm bài.
- [ ] An toàn/riêng tư: xác nhận dữ liệu camera không lưu ngoài phạm vi cảnh báo cần thiết.

### 3.3 Tối ưu và hoàn thiện
- [ ] Tối ưu hiệu năng giao diện, tốc độ phản hồi.
- [ ] Chuẩn bị dữ liệu demo (câu hỏi, đề thi, kỳ thi, tài khoản) cho các kịch bản bảo vệ.
- [ ] Viết báo cáo: kiến trúc AI, luồng tích hợp, thiết kế dữ liệu, bảo mật, đánh giá, giới hạn hệ thống.
- [ ] Thu thập phản hồi từ demo thử nghiệm, tinh chỉnh trước bảo vệ.

## 4. Bảo mật & quyền riêng tư (áp dụng xuyên suốt)

- [ ] Không gửi dữ liệu cá nhân không cần thiết vào prompt AI.
- [ ] API key AI chỉ ở backend, không xuống frontend.
- [ ] Xử lý camera ưu tiên tại trình duyệt, không lưu video liên tục nếu không cần thiết.
- [ ] Phân quyền rõ ràng cho việc xem log AI và log cảnh báo.
- [ ] Lưu vết đầy đủ lịch sử tạo câu hỏi AI và lịch sử cảnh báo (đã có bảng `ai_generations`, `proctoring_events`).

## 5. Rủi ro / giới hạn cần nêu rõ trong báo cáo

- Hệ thống chỉ **cảnh báo hỗ trợ**, không tự động kết luận gian lận hay trừ điểm.
- Quota API LLM miễn phí có thể giới hạn số lần demo — cần fallback/mock khi hết quota.
- MediaPipe chạy client-side phụ thuộc thiết bị/trình duyệt của thí sinh — cần kiểm thử đa trình duyệt cơ bản (Chrome tối thiểu).

Tests were not run. Recommended manual test command: `cd backend && php artisan test` và `cd frontend && npm run build`.
