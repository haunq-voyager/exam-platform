"use client";


import { tr } from "../../../lib/i18n";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Lock, Plus, Save, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { ToggleSwitch } from "../../../components/SessionSwitch";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { useToast } from "../../../lib/toast";
import type { ApprovalLevel, PermissionKey, PermissionMatrix, UserRole } from "../../../lib/types";

type Tab = "permissions" | "levels";

const APPROVER_ROLES: { key: UserRole; label: string }[] = [
  { key: "department_head", get label() { return tr("Trưởng khoa"); } },
  { key: "training_office", get label() { return tr("Phòng đào tạo"); } },
  { key: "teacher", get label() { return tr("Giảng viên"); } }
];

export default function RolesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("permissions");
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [draft, setDraft] = useState<Record<string, PermissionKey[]>>({});
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get<{ data: PermissionMatrix }>("/roles/permissions"), api.get<{ data: ApprovalLevel[] }>("/approval-levels")])
      .then(([matrixResponse, levelsResponse]) => {
        setMatrix(matrixResponse.data);
        setDraft(Object.fromEntries(matrixResponse.data.roles.map((role) => [role.key, role.permissions])));
        setLevels(levelsResponse.data);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : tr("Không thể tải dữ liệu phân quyền.")));
  }, []);

  if (!can(user, "roles.manage")) {
    return <div className="emptyState">{tr("Bạn không có quyền phân quyền và cấu hình cấp duyệt.")}</div>;
  }

  if (!matrix) {
    return <div className="emptyState">{error ?? tr("Đang tải...")}</div>;
  }

  const dirtyRoles = matrix.roles.filter(
    (role) => role.configurable && [...(draft[role.key] ?? [])].sort().join() !== [...role.permissions].sort().join()
  );
  const groups = Array.from(new Set(matrix.permissions.map((permission) => permission.group)));

  function toggle(role: string, permission: PermissionKey) {
    setDraft((current) => {
      const list = current[role] ?? [];
      return { ...current, [role]: list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission] };
    });
  }

  async function savePermissions() {
    setError(null);
    setSaving(true);
    try {
      let latest = matrix as PermissionMatrix;
      for (const role of dirtyRoles) {
        const response = await api.put<{ data: PermissionMatrix }>(`/roles/${role.key}/permissions`, { permissions: draft[role.key] });
        latest = response.data;
      }
      setMatrix(latest);
      setDraft(Object.fromEntries(latest.roles.map((role) => [role.key, role.permissions])));
      showToast(tr("Đã lưu phân quyền."));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể lưu phân quyền."));
    } finally {
      setSaving(false);
    }
  }

  function patchLevel(index: number, patch: Partial<ApprovalLevel>) {
    setLevels((current) => current.map((level, position) => (position === index ? { ...level, ...patch } : level)));
  }

  function moveLevel(index: number, delta: number) {
    setLevels((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveLevels() {
    setError(null);
    if (levels.some((level) => !level.name.trim())) {
      setError(tr("Mỗi cấp duyệt cần có tên."));
      return;
    }
    setSaving(true);
    try {
      const response = await api.put<{ data: ApprovalLevel[] }>("/approval-levels", {
        levels: levels.map((level) => ({ id: level.id ?? null, name: level.name, role: level.role, scope: level.scope, is_active: level.is_active }))
      });
      setLevels(response.data);
      showToast(tr("Đã lưu các cấp duyệt."));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể lưu cấp duyệt."));
    } finally {
      setSaving(false);
    }
  }

  const activeCount = levels.filter((level) => level.is_active).length;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">{tr("Quản trị")}</p>
          <h1>{tr("Phân quyền & cấp duyệt")}</h1>
        </div>
      </header>

      <div className="tabBar">
        <button className={tab === "permissions" ? "tabButton active" : "tabButton"} onClick={() => setTab("permissions")}>
          {tr("Quyền theo vai trò")}
        </button>
        <button className={tab === "levels" ? "tabButton active" : "tabButton"} onClick={() => setTab("levels")}>
          {tr("Cấp duyệt kỳ thi (")}{activeCount})
        </button>
      </div>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      {tab === "permissions" ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Ma trận quyền")}</p>
              <h2>{tr("Mỗi vai trò được làm gì")}</h2>
            </div>
            <button className="primaryButton" onClick={savePermissions} disabled={saving || dirtyRoles.length === 0}>
              <Save size={16} />
              {saving ? tr("Đang lưu...") : dirtyRoles.length ? tr("Lưu thay đổi ({0} vai trò)", dirtyRoles.length) : tr("Lưu thay đổi")}
            </button>
          </div>
          <p className="reviewEmpty" style={{ marginTop: 0 }}>
            {tr("Quản trị viên luôn có mọi quyền và thí sinh không có quyền quản lý nào, hai vai trò này không chỉnh được. Quyền duyệt kỳ thi được cấu hình riêng ở tab “Cấp duyệt”.")}
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{tr("Quyền")}</th>
                  {matrix.roles.map((role) => (
                    <th key={role.key} style={{ textAlign: "center" }}>
                      {role.label}
                      {!role.configurable ? <Lock size={12} style={{ marginLeft: 4 }} /> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group}>
                  <tr>
                    <td colSpan={matrix.roles.length + 1} className="sideTitle" style={{ background: "#f8fafc", padding: "8px 12px" }}>
                      {tr(group)}
                    </td>
                  </tr>
                  {matrix.permissions
                    .filter((permission) => permission.group === group)
                    .map((permission) => (
                      <tr key={permission.key}>
                        <td>{tr(permission.label)}</td>
                        {matrix.roles.map((role) => {
                          const checked = (draft[role.key] ?? []).includes(permission.key);
                          return (
                            <td key={role.key} style={{ textAlign: "center" }}>
                              {role.configurable ? (
                                <input type="checkbox" checked={checked} onChange={() => toggle(role.key, permission.key)} aria-label={`${role.label}: ${permission.label}`} />
                              ) : (
                                <Check size={16} color={checked ? "#16a34a" : "#cbd5e1"} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Quy trình duyệt")}</p>
              <h2>{tr("Các cấp duyệt kỳ thi")}</h2>
            </div>
            <button className="primaryButton" onClick={saveLevels} disabled={saving}>
              <Save size={16} />
              {saving ? tr("Đang lưu...") : tr("Lưu cấp duyệt")}
            </button>
          </div>
          <p className="reviewEmpty" style={{ marginTop: 0 }}>
            {tr("Kỳ thi phải được duyệt lần lượt qua từng cấp đang bật (từ trên xuống) mới bật được. “Theo khoa”: người duyệt phải thuộc khoa của kỳ thi. Không ai tự duyệt kỳ thi của mình; quản trị viên duyệt được ở mọi cấp. Nếu tắt hết các cấp thì kỳ thi không cần duyệt.")}
          </p>

          {levels.length === 0 ? <div className="emptyState">{tr("Chưa có cấp duyệt nào, kỳ thi không cần duyệt.")}</div> : null}
          <div className="questionList">
            {levels.map((level, index) => (
              <div className="questionItem" key={level.id ?? `new-${index}`} style={{ gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12 }}>
                <b style={{ minWidth: 28 }}>{tr("Cấp")} {index + 1}</b>
                <div className="controlRow" style={{ margin: 0, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label className="field" style={{ flex: "2 1 200px" }}>
                    <span>{tr("Tên cấp")}</span>
                    <input value={level.name} onChange={(event) => patchLevel(index, { name: event.target.value })} maxLength={255} />
                  </label>
                  <label className="field" style={{ flex: "1 1 150px" }}>
                    <span>{tr("Vai trò duyệt")}</span>
                    <select value={level.role} onChange={(event) => patchLevel(index, { role: event.target.value as UserRole })}>
                      {APPROVER_ROLES.map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field" style={{ flex: "1 1 150px" }}>
                    <span>{tr("Phạm vi")}</span>
                    <select value={level.scope} onChange={(event) => patchLevel(index, { scope: event.target.value as ApprovalLevel["scope"] })}>
                      <option value="department">{tr("Theo khoa của kỳ thi")}</option>
                      <option value="global">{tr("Toàn trường")}</option>
                    </select>
                  </label>
                  <span className="switchRow">
                    <ToggleSwitch checked={level.is_active} label={level.is_active ? tr("Tắt cấp này") : tr("Bật cấp này")} onClick={() => patchLevel(index, { is_active: !level.is_active })} />
                    {level.is_active ? tr("Đang bật") : tr("Tạm tắt")}
                  </span>
                </div>
                <div className="controlRow" style={{ margin: 0, gap: 4 }}>
                  <button className="iconButton" title={tr("Lên")} onClick={() => moveLevel(index, -1)} disabled={index === 0}>
                    <ArrowUp size={15} />
                  </button>
                  <button className="iconButton" title={tr("Xuống")} onClick={() => moveLevel(index, 1)} disabled={index === levels.length - 1}>
                    <ArrowDown size={15} />
                  </button>
                  <button className="iconButton" title={tr("Xóa cấp")} onClick={() => setLevels((current) => current.filter((_, position) => position !== index))}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="approveButton"
            style={{ marginTop: 14 }}
            onClick={() => setLevels((current) => [...current, { name: tr("Cấp {0}", current.length + 1), role: "training_office", scope: "global", is_active: true }])}
          >
            <Plus size={16} />
            {tr("Thêm cấp duyệt")}
          </button>
        </section>
      )}
    </>
  );
}
