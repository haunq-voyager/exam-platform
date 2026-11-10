<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_attempts')->default(1);
            $table->string('scoring_method')->default('highest');
            $table->boolean('proctoring_enabled')->default(true);
            $table->unsignedSmallInteger('max_violations')->default(3);
        });
    }

    public function down(): void
    {
        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->dropColumn(['max_attempts', 'scoring_method', 'proctoring_enabled', 'max_violations']);
        });
    }
};
