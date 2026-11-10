<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** How many days before the exam the reminder goes out: one number or a list ("7", "7,3,1"). */
    public function up(): void
    {
        Schema::table('mail_templates', function (Blueprint $table) {
            $table->string('send_days_before', 40)->default('7')->after('is_active');
        });

        // The template is no longer "7 days" by definition; only its name and description change, not the wording.
        DB::table('mail_templates')->where('key', 'student_exam_reminder')->update([
            'name' => 'Nhắc lịch thi cho thí sinh',
            'description' => 'Gửi tự động cho từng thí sinh được gán vào kỳ thi, trước giờ bắt đầu theo số ngày được cấu hình.',
        ]);
    }

    public function down(): void
    {
        Schema::table('mail_templates', function (Blueprint $table) {
            $table->dropColumn('send_days_before');
        });
    }
};
