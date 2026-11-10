<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->unsignedSmallInteger('attempt_number')->default(1);
            $table->unsignedSmallInteger('violation_count')->default(0);
            $table->boolean('is_flagged')->default(false);
            $table->string('cancel_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('exam_attempts', function (Blueprint $table) {
            $table->dropColumn(['attempt_number', 'violation_count', 'is_flagged', 'cancel_reason']);
        });
    }
};
