<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropIndex(['exam_id', 'student_id']);
            $table->dropForeign(['exam_id']);
            $table->renameColumn('exam_id', 'exam_session_id');
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->foreign('exam_session_id')->references('id')->on('exam_sessions')->cascadeOnDelete();
            $table->index(['exam_session_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropIndex(['exam_session_id', 'student_id']);
            $table->dropForeign(['exam_session_id']);
            $table->renameColumn('exam_session_id', 'exam_id');
        });

        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->foreign('exam_id')->references('id')->on('exams')->cascadeOnDelete();
            $table->index(['exam_id', 'student_id']);
        });
    }
};
