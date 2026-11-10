<?php

use App\Enums\Permission;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role');
            $table->string('permission');
            $table->timestamps();

            $table->unique(['role', 'permission']);
        });

        $rows = [];
        foreach (Permission::defaultsByRole() as $role => $permissions) {
            foreach ($permissions as $permission) {
                $rows[] = ['role' => $role, 'permission' => $permission->value, 'created_at' => now(), 'updated_at' => now()];
            }
        }
        DB::table('role_permissions')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }
};
