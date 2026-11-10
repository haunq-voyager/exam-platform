<?php

use App\Enums\Permission;
use App\Enums\UserRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Teachers used to prepare exams themselves. The split is now: administrators prepare, teachers proctor, handle
 * regrading requests and reply to feedback. Resets the teacher row of the permission matrix to those defaults
 * (it stays editable afterwards).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('role_permissions')->where('role', UserRole::Teacher->value)->delete();

        DB::table('role_permissions')->insert(array_map(fn (Permission $permission) => [
            'role' => UserRole::Teacher->value,
            'permission' => $permission->value,
            'created_at' => now(),
            'updated_at' => now(),
        ], Permission::defaultsByRole()[UserRole::Teacher->value]));
    }

    public function down(): void
    {
        // The previous defaults are not restored: permissions are data that administrators own.
    }
};
