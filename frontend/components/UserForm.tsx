"use client";


import { tr } from "../lib/i18n";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useToast } from "../lib/toast";
import { ROLE_LABEL } from "../lib/permissions";
import type { User, UserRole } from "../lib/types";
import { DateField } from "./DateField";
import { DepartmentSelect } from "./DepartmentSelect";

export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  userCode: string;
  departmentId: string;
  major: string;
  classCode: string;
  academicYear: string;
  studyStartYear: string;
  studyEndYear: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  permanentAddress: string;
  temporaryAddress: string;
}

export const EMPTY_USER_FORM: UserFormValues = {
  name: "",
  email: "",
  password: "",
  role: "student",
  userCode: "",
  departmentId: "",
  major: "",
  classCode: "",
  academicYear: "",
  studyStartYear: "",
  studyEndYear: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  permanentAddress: "",
  temporaryAddress: ""
};

export function valuesFromUser(user: User): UserFormValues {
  return {
    name: user.name,
    email: user.email,
    password: "",
    role: user.role,
    userCode: user.user_code ?? "",
    departmentId: user.department_id ? String(user.department_id) : "",
    major: user.major ?? "",
    classCode: user.class_code ?? "",
    academicYear: user.academic_year ?? "",
    studyStartYear: user.study_start_year ? String(user.study_start_year) : "",
    studyEndYear: user.study_end_year ? String(user.study_end_year) : "",
    dateOfBirth: user.date_of_birth ?? "",
    gender: user.gender ?? "",
    phone: user.phone ?? "",
    permanentAddress: user.permanent_address ?? "",
    temporaryAddress: user.temporary_address ?? ""
  };
}

const blank = (value: string) => (value.trim() === "" ? null : value.trim());

/** Request body of POST/PATCH /users. Empty text becomes null so an edit clears the field. */
export function userPayload(values: UserFormValues, mode: "create" | "edit") {
  const student = values.role === "student";
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role,
    ...(values.password || mode === "create" ? { password: values.password } : {}),
    user_code: blank(values.userCode),
    // Major, class and intake year only exist for students; a department only for staff.
    major: student ? blank(values.major) : null,
    class_code: student ? blank(values.classCode) : null,
    academic_year: student ? blank(values.academicYear) : null,
    study_start_year: student && values.studyStartYear ? Number(values.studyStartYear) : null,
    study_end_year: student && values.studyEndYear ? Number(values.studyEndYear) : null,
    department_id: !student && values.departmentId ? Number(values.departmentId) : null,
    date_of_birth: blank(values.dateOfBirth),
    gender: blank(values.gender),
    phone: blank(values.phone),
    permanent_address: blank(values.permanentAddress),
    temporary_address: blank(values.temporaryAddress)
  };
}

/** Years offered for the study period: around today, widened to keep an existing value selectable. */
function yearOptions(...selected: string[]): number[] {
  const now = new Date().getFullYear();
  const chosen = selected.map(Number).filter((year) => year > 0);
  const from = Math.min(now - 15, ...chosen);
  const to = Math.max(now + 8, ...chosen);
  return Array.from({ length: to - from + 1 }, (_, index) => to - index);
}

/** Dropdown of the ngành catalogue; "Thêm ngành mới…" creates one on the spot and selects it. */
function MajorSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { showToast } = useToast();
  const [majors, setMajors] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<{ data: { id: number; name: string }[] }>("/majors")
      .then((response) => setMajors(response.data.map((major) => major.name)))
      .catch(() => setMajors([]));
  }, []);

  // A major typed before the catalogue existed stays selectable.
  const options = value && !majors.includes(value) ? [value, ...majors] : majors;

  async function addMajor() {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.post("/majors", { name });
      setMajors((current) => [...current, name].sort((a, b) => a.localeCompare(b, "vi")));
      onChange(name);
      setAdding(false);
      setDraft("");
      showToast(tr("Đã thêm ngành “{0}”.", name));
    } catch (err) {
      const first = err instanceof ApiError ? Object.values(err.errors ?? {}).flat()[0] : undefined;
      showToast(first ?? tr("Không thể thêm ngành."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor="major-select">{tr("Ngành")}</label>
      <select
        id="major-select"
        value={adding ? "__new" : value}
        onChange={(event) => {
          if (event.target.value === "__new") {
            setAdding(true);
          } else {
            setAdding(false);
            onChange(event.target.value);
          }
        }}
      >
        <option value="">{tr("Chưa chọn ngành")}</option>
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value="__new">{tr("＋ Thêm ngành mới…")}</option>
      </select>
      {adding ? (
        <div className="controlRow" style={{ margin: "8px 0 0", alignItems: "center" }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addMajor();
              }
            }}
            placeholder={tr("Tên ngành mới")}
            maxLength={255}
            autoFocus
            aria-label={tr("Tên ngành mới")}
          />
          <button type="button" className="primaryButton" onClick={addMajor} disabled={busy || !draft.trim()}>
            {tr("Thêm")}
          </button>
          <button type="button" className="approveButton" onClick={() => setAdding(false)}>
            {tr("Hủy")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface Props {
  mode: "create" | "edit";
  initial: UserFormValues;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

/** Account + profile form shared by "Thêm người dùng" and "Sửa người dùng". */
export function UserForm({ mode, initial, submitLabel, onSubmit }: Props) {
  const [values, setValues] = useState<UserFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const student = values.role === "student";
  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const first = err instanceof ApiError ? Object.values(err.errors ?? {}).flat()[0] : undefined;
      setError(first ?? (err instanceof ApiError ? err.message : tr("Không thể lưu người dùng.")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className="formError" role="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <fieldset className="formSection">
        <legend>{tr("Tài khoản")}</legend>
        <div className="formGrid">
          <label className="field">
            <span>{tr("Họ tên")}</span>
            <input value={values.name} onChange={(event) => set("name", event.target.value)} required autoFocus maxLength={255} />
          </label>
          <label className="field">
            <span>{tr("Email")}</span>
            <input type="email" value={values.email} onChange={(event) => set("email", event.target.value)} required maxLength={255} />
          </label>
          <label className="field">
            <span>{mode === "create" ? tr("Mật khẩu") : tr("Mật khẩu mới (để trống nếu không đổi)")}</span>
            <input type="password" minLength={8} value={values.password} onChange={(event) => set("password", event.target.value)} required={mode === "create"} autoComplete="new-password" />
          </label>
          <label className="field">
            <span>{tr("Vai trò")}</span>
            <select value={values.role} onChange={(event) => set("role", event.target.value as UserRole)}>
              {(["admin", "teacher", "department_head", "training_office", "student"] as UserRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="formSection">
        <legend>{student ? tr("Thông tin sinh viên") : tr("Thông tin công tác")}</legend>
        <div className="formGrid">
          <label className="field">
            <span>{student ? tr("Mã sinh viên") : tr("Mã giảng viên / cán bộ")}</span>
            <input value={values.userCode} onChange={(event) => set("userCode", event.target.value)} placeholder={student ? "VD: 20521453" : "VD: GV0012"} maxLength={30} />
          </label>
          {student ? (
            <>
              <MajorSelect value={values.major} onChange={(value) => set("major", value)} />
              <label className="field">
                <span>{tr("Mã lớp")}</span>
                <input value={values.classCode} onChange={(event) => set("classCode", event.target.value)} placeholder={tr("VD: SE2021.1")} maxLength={50} />
              </label>
              <label className="field">
                <span>{tr("Khóa")}</span>
                <input value={values.academicYear} onChange={(event) => set("academicYear", event.target.value)} placeholder={tr("VD: K2021")} maxLength={30} />
              </label>
              <label className="field">
                <span>{tr("Học từ năm")}</span>
                <select value={values.studyStartYear} onChange={(event) => { set("studyStartYear", event.target.value); if (event.target.value && values.studyEndYear && Number(values.studyEndYear) < Number(event.target.value)) set("studyEndYear", ""); }}>
                  <option value="">{tr("Chưa chọn")}</option>
                  {yearOptions(values.studyStartYear, values.studyEndYear).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{tr("Đến năm (dự kiến)")}</span>
                <select value={values.studyEndYear} onChange={(event) => set("studyEndYear", event.target.value)} disabled={!values.studyStartYear} title={values.studyStartYear ? undefined : tr("Chọn năm bắt đầu học trước")}>
                  <option value="">{tr("Chưa chọn")}</option>
                  {yearOptions(values.studyStartYear, values.studyEndYear)
                    .filter((year) => !values.studyStartYear || year >= Number(values.studyStartYear))
                    .map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
              </label>
            </>
          ) : (
            <div>
              <DepartmentSelect value={values.departmentId} onChange={(value) => set("departmentId", value)} label={tr("Khoa (người duyệt kỳ thi được xác định theo khoa)")} />
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="formSection">
        <legend>{tr("Thông tin cá nhân")}</legend>
        <div className="formGrid">
          <DateField label={tr("Ngày sinh")} value={values.dateOfBirth} onChange={(value) => set("dateOfBirth", value)} max={new Date().toISOString().slice(0, 10)} />
          <label className="field">
            <span>{tr("Giới tính")}</span>
            <select value={values.gender} onChange={(event) => set("gender", event.target.value)}>
              <option value="">{tr("Chưa chọn")}</option>
              <option value="male">{tr("Nam")}</option>
              <option value="female">{tr("Nữ")}</option>
              <option value="other">{tr("Khác")}</option>
            </select>
          </label>
          <label className="field">
            <span>{tr("Số điện thoại")}</span>
            <input type="tel" value={values.phone} onChange={(event) => set("phone", event.target.value)} placeholder={tr("VD: 0901234567")} maxLength={20} />
          </label>
          <label className="field formWide">
            <span>{tr("Địa chỉ thường trú")}</span>
            <textarea
              className="textarea"
              rows={3}
              value={values.permanentAddress}
              onChange={(event) => set("permanentAddress", event.target.value)}
              placeholder={tr("Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố")}
              maxLength={1000}
            />
          </label>
          <div className="field formWide">
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <label htmlFor="temporary-address">{tr("Địa chỉ tạm trú")}</label>
              <button type="button" className="linkButton" onClick={() => set("temporaryAddress", values.permanentAddress)} disabled={!values.permanentAddress.trim()}>
                {tr("Giống địa chỉ thường trú")}
              </button>
            </span>
            <textarea
              id="temporary-address"
              className="textarea"
              rows={3}
              value={values.temporaryAddress}
              onChange={(event) => set("temporaryAddress", event.target.value)}
              placeholder={tr("Nơi đang ở hiện nay (bỏ trống nếu trùng thường trú)")}
              maxLength={1000}
            />
          </div>
        </div>
      </fieldset>

      <button className="primaryButton" type="submit" disabled={busy} aria-busy={busy || undefined}>
        <Save size={16} aria-hidden="true" />
        {busy ? tr("Đang lưu…") : submitLabel}
      </button>
    </form>
  );
}
