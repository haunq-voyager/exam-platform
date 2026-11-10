<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->string('code', 20)->nullable();
        });

        // Same format as ExamSession::makeCode(): KT + yymm of creation + zero-padded id.
        DB::statement("UPDATE exam_sessions SET code = 'KT' || to_char(created_at, 'YYMM') || '-' || lpad(id::text, 4, '0') WHERE code IS NULL");

        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->unique('code');
        });
    }

    public function down(): void
    {
        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn('code');
        });
    }
};
