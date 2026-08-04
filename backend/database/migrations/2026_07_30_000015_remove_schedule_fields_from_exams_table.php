<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->dropIndex(['status', 'start_at']);
            $table->dropColumn(['status', 'start_at', 'end_at']);
        });
    }

    public function down(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->string('status')->default('draft');
            $table->timestamp('start_at')->nullable();
            $table->timestamp('end_at')->nullable();

            $table->index(['status', 'start_at']);
        });
    }
};
