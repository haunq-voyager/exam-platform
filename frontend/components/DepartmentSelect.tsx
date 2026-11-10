"use client";


import { tr } from "../lib/i18n";
import { useEffect, useState } from "react";
import { api } from "../lib/api-client";
import type { Department } from "../lib/types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  emptyLabel?: string;
  required?: boolean;
}

/** Select of departments (khoa) loaded from the API. `value` is the department id as a string, "" for none. */
export function DepartmentSelect({ value, onChange, label = "Khoa", emptyLabel = tr("-- Không thuộc khoa --"), required }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    api
      .get<{ data: Department[] }>("/departments")
      .then((response) => setDepartments(response.data))
      .catch(() => setDepartments([]));
  }, []);

  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">{emptyLabel}</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
    </label>
  );
}
