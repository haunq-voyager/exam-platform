"use client";


import { tr } from "../lib/i18n";
import { RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";

interface ToolbarProps {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string };
  /** Filter controls (use FilterSelect). */
  children?: ReactNode;
  /** Shown only while a search or filter is active. */
  onReset?: () => void;
  active?: boolean;
  /** Primary actions of the table (e.g. "Tạo kỳ thi"). */
  end?: ReactNode;
}

/** The row above every data table: search, filters, "clear filters", and the table's actions. */
export function TableToolbar({ search, children, onReset, active = false, end }: ToolbarProps) {
  return (
    <div className="tableToolbar" role="search">
      {search ? (
        <label className="tableSearch">
          <span className="srOnly">{search.label ?? tr("Tìm kiếm")}</span>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder={search.placeholder ?? tr("Tìm kiếm…")}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
      ) : null}
      {children}
      {onReset && active ? (
        <button className="approveButton" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {tr("Xóa bộ lọc")}
        </button>
      ) : null}
      {end ? <div className="tableToolbarEnd">{end}</div> : null}
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Label of the "no filter" option. */
  allLabel?: string;
}

export function FilterSelect({ label, value, onChange, options, allLabel = tr("Tất cả") }: FilterSelectProps) {
  return (
    <label className="tableFilter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
