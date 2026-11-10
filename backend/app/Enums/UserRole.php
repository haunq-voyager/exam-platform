<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Teacher = 'teacher';
    case DepartmentHead = 'department_head';
    case TrainingOffice = 'training_office';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Quản trị viên',
            self::Teacher => 'Giảng viên',
            self::DepartmentHead => 'Trưởng khoa',
            self::TrainingOffice => 'Phòng đào tạo',
            self::Student => 'Thí sinh',
        };
    }

    /** Roles whose permissions can be edited in the permission matrix (admin always has everything, students nothing). */
    public function isConfigurable(): bool
    {
        return ! in_array($this, [self::Admin, self::Student], true);
    }

    /** Staff roles (everyone who works in the management area). */
    public function isStaff(): bool
    {
        return $this !== self::Student;
    }
}
