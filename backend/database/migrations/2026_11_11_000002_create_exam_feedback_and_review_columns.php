<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Student feedback about an exam session (or one of their attempts) and the teacher's reply.
        Schema::create('exam_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_attempt_id')->nullable()->constrained('exam_attempts')->nullOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->text('message');
            $table->text('reply')->nullable();
            $table->foreignId('replied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->index(['exam_session_id', 'replied_at']);
            $table->index('student_id');
        });

        // The reviewer's explanation of a regrading decision.
        Schema::table('regrade_requests', function (Blueprint $table) {
            $table->text('response')->nullable();
        });

        // A proctor can cancel an attempt by hand; keep who did it and why.
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->text('cancel_note')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancelled_by');
            $table->dropColumn('cancel_note');
        });

        Schema::table('regrade_requests', function (Blueprint $table) {
            $table->dropColumn('response');
        });

        Schema::dropIfExists('exam_feedback');
    }
};
