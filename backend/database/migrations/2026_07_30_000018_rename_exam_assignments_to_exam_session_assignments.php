<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('exam_assignments', 'exam_session_assignments');

        Schema::table('exam_session_assignments', function (Blueprint $table) {
            $table->dropUnique('exam_assignments_exam_id_student_id_unique');
            $table->dropForeign('exam_assignments_exam_id_foreign');
            $table->renameColumn('exam_id', 'exam_session_id');
        });

        Schema::table('exam_session_assignments', function (Blueprint $table) {
            $table->foreign('exam_session_id')->references('id')->on('exam_sessions')->cascadeOnDelete();
            $table->unique(['exam_session_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::table('exam_session_assignments', function (Blueprint $table) {
            $table->dropUnique(['exam_session_id', 'student_id']);
            $table->dropForeign(['exam_session_id']);
            $table->renameColumn('exam_session_id', 'exam_id');
        });

        Schema::table('exam_session_assignments', function (Blueprint $table) {
            $table->foreign('exam_id')->references('id')->on('exams')->cascadeOnDelete();
            $table->unique(['exam_id', 'student_id']);
        });

        Schema::rename('exam_session_assignments', 'exam_assignments');
    }
};
