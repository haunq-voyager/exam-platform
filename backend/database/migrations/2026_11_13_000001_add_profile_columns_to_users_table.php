<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Basic profile data: student / staff code, class, intake year, birth date, gender, phone and address. */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('user_code', 30)->nullable()->unique()->after('email');
            $table->string('class_code', 50)->nullable()->after('major');
            $table->string('academic_year', 30)->nullable()->after('class_code');
            $table->date('date_of_birth')->nullable()->after('academic_year');
            $table->string('gender', 10)->nullable()->after('date_of_birth');
            $table->string('phone', 20)->nullable()->after('gender');
            $table->string('address', 500)->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['user_code']);
            $table->dropColumn(['user_code', 'class_code', 'academic_year', 'date_of_birth', 'gender', 'phone', 'address']);
        });
    }
};
