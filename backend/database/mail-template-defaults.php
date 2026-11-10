<?php

/**
 * Default wording and look of the emails, by template key. Used to seed the templates (migration) and by the
 * "Khôi phục mặc định" button of the admin screen.
 */
return [
    'student_exam_reminder' => [
        'name' => 'Nhắc lịch thi cho thí sinh',
        'description' => 'Gửi tự động cho từng thí sinh được gán vào kỳ thi, trước giờ bắt đầu theo số ngày được cấu hình.',
        'subject' => '[Nhắc lịch thi] {{exam_title}} - còn {{days_left}} ngày',
        'body_html' => <<<'HTML'
<p>Xin chào <strong>{{student_name}}</strong>,</p>
<p>Bạn có một kỳ thi sắp diễn ra. Hãy chuẩn bị thật tốt và vào hệ thống đúng giờ nhé.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;width:38%"><strong>Kỳ thi</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{exam_title}} ({{exam_code}})</td></tr>
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Bắt đầu</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{start_time}}</td></tr>
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Kết thúc</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{end_time}}</td></tr>
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Thời gian làm bài</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{duration}} phút</td></tr>
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Số câu hỏi</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{question_count}} câu</td></tr>
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Số lần được thi</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{max_attempts}} lần</td></tr>
  <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Giám sát</strong></td><td style="padding:8px 12px;border:1px solid #e2e8f0">{{proctoring_note}}</td></tr>
</table>
<p><strong>Lưu ý trước khi thi</strong></p>
<ul>
  <li>Chuẩn bị máy tính có camera và đường truyền Internet ổn định.</li>
  <li>Đăng nhập thử trước giờ thi để kiểm tra tài khoản.</li>
  <li>Đọc kỹ quy chế thi, không chuyển tab hoặc rời khỏi màn hình làm bài.</li>
</ul>
<p>Chúc bạn làm bài thật tốt!</p>
HTML,
        'button_label' => 'Vào trang kỳ thi',
        'accent_color' => '#2563eb',
        'footer_text' => 'Email này được gửi tự động từ hệ thống {{app_name}}. Vui lòng không trả lời trực tiếp email này.',
        'is_active' => true,
        'send_days_before' => '7',
    ],
];
