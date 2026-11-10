<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Profile: permanent and temporary address (free text), study period (from / to year).
     * Approval: the training office joins the chain after the department head, like a second signature.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('address', 'permanent_address');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->text('permanent_address')->nullable()->change();
            $table->text('temporary_address')->nullable()->after('permanent_address');
            $table->unsignedSmallInteger('study_start_year')->nullable()->after('academic_year');
            $table->unsignedSmallInteger('study_end_year')->nullable()->after('study_start_year');
        });

        if (! DB::table('approval_levels')->where('role', 'training_office')->exists()) {
            DB::table('approval_levels')->insert([
                'position' => ((int) DB::table('approval_levels')->max('position')) + 1,
                'name' => 'Phòng đào tạo duyệt',
                'role' => 'training_office',
                'scope' => 'global',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('approval_levels')->where('role', 'training_office')->where('name', 'Phòng đào tạo duyệt')->delete();

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['temporary_address', 'study_start_year', 'study_end_year']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('permanent_address', 'address');
        });
    }
};
