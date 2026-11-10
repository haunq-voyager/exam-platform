"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api-client";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { locale, tr } from "../lib/i18n";
import type { DashboardCharts } from "../lib/types";

const STAGE_COLORS: Record<keyof DashboardCharts["session_stages"], string> = {
  draft: "#94A3B8",
  pending: "#F59E0B",
  rejected: "#EF4444",
  scheduled: "#6366F1",
  open: "#06B6D4",
  closed: "#475569"
};

const BAR_COLOR = "#4F46E5";
const AXIS_TICK = { fill: "#64748B", fontSize: 12 };
const CURSOR = { fill: "rgba(15, 23, 42, 0.05)" };

function stageLabel(stage: keyof DashboardCharts["session_stages"]): string {
  switch (stage) {
    case "draft":
      return tr("Nháp");
    case "pending":
      return tr("Chờ duyệt");
    case "rejected":
      return tr("Bị từ chối");
    case "scheduled":
      return tr("Sắp diễn ra");
    case "open":
      return tr("Đang mở");
    default:
      return tr("Đã đóng");
  }
}

function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(), { month: "2-digit", year: "2-digit" }).format(new Date(year, number - 1, 1));
}

function ChartCard({ eyebrow, title, hint, empty, children }: { eyebrow: string; title: string; hint: string; empty: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="modernCard">
      <div className="modernCardHeader">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <small className="chartHint">{hint}</small>
        </div>
      </div>
      {empty ?? children}
    </article>
  );
}

function EmptyChart({ title, text }: { title: string; text: string }) {
  return (
    <div className="miniEmpty">
      <BarChart3 size={24} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Overview charts for staff: where the exams stand, how many start each month, how the graded attempts scored.
 * Narrowed by year, month (of the start time) and, for users not tied to a department, by department.
 */
export function StaffCharts() {
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [updating, setUpdating] = useState(false);
  // The filter options come with the data; keep the first answer so choosing a value does not shrink the lists.
  const [options, setOptions] = useState<DashboardCharts["filters"]>({ years: [], departments: [] });

  useEffect(() => {
    let current = true;
    setUpdating(true);
    api
      .get<{ data: DashboardCharts }>("/dashboard/charts", { year, month, department_id: departmentId })
      .then((response) => {
        if (!current) return;
        setCharts(response.data);
        setOptions(response.data.filters);
      })
      .catch(() => undefined)
      .finally(() => {
        if (current) setUpdating(false);
      });
    return () => {
      current = false;
    };
  }, [year, month, departmentId]);

  if (!charts) return null;

  const filtered = year !== "" || month !== "" || departmentId !== "";
  const stages = (Object.keys(STAGE_COLORS) as (keyof DashboardCharts["session_stages"])[]).map((stage) => ({
    key: stage,
    name: stageLabel(stage),
    total: charts.session_stages[stage] ?? 0
  }));
  const months = charts.sessions_per_month.map((item) => ({ name: monthLabel(item.month), total: item.total }));
  const scores = charts.score_distribution.map((item) => ({ name: `${item.from}–${item.to}%`, total: item.total }));

  const noExams = stages.every((item) => item.total === 0);
  const noMonths = months.every((item) => item.total === 0);
  const noScores = scores.every((item) => item.total === 0);

  return (
    <>
    <section className="chartFilters" aria-label={tr("Bộ lọc biểu đồ")}>
      <label className="field compactMonth">
        {tr("Năm")}
        <select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">{tr("Tất cả năm")}</option>
          {options.years.map((value) => (
            <option value={value} key={value}>
              {tr("Năm {0}", value)}
            </option>
          ))}
        </select>
      </label>
      <label className="field compactMonth">
        {tr("Tháng")}
        <select value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="">{tr("Tất cả tháng")}</option>
          {MONTH_NUMBERS.map((value) => (
            <option value={value} key={value}>
              {tr("Tháng {0}", value)}
            </option>
          ))}
        </select>
      </label>
      {options.departments.length > 0 ? (
        <label className="field compactMonth wideFilter">
          {tr("Khoa")}
          <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
            <option value="">{tr("Tất cả khoa")}</option>
            {options.departments.map((department) => (
              <option value={department.id} key={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {filtered ? (
        <button
          type="button"
          className="secondaryButton"
          onClick={() => {
            setYear("");
            setMonth("");
            setDepartmentId("");
          }}
        >
          {tr("Xóa bộ lọc")}
        </button>
      ) : null}
    </section>

    <section className={updating ? "chartsRow updating" : "chartsRow"} aria-busy={updating}>
      <ChartCard
        eyebrow={tr("Giai đoạn")}
        title={tr("Kỳ thi theo giai đoạn")}
        hint={tr("Trạng thái")}
        empty={noExams ? <EmptyChart title={tr("Chưa có kỳ thi nào")} text="" /> : null}
      >
        <div role="img" aria-label={stages.map((item) => `${item.name}: ${item.total}`).join(", ")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stages} layout="vertical" margin={{ top: 4, right: 32, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#EEF2F7" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <Tooltip cursor={CURSOR} formatter={(value) => [tr("{0} kỳ thi", Number(value)), ""]} separator="" />
              <Bar dataKey="total" barSize={14} radius={[0, 4, 4, 0]}>
                {stages.map((item) => (
                  <Cell key={item.key} fill={STAGE_COLORS[item.key]} />
                ))}
                <LabelList dataKey="total" position="right" fill="#334155" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        eyebrow={tr("Theo tháng")}
        title={tr("Kỳ thi theo tháng")}
        hint={year !== "" ? tr("12 tháng của năm {0}", year) : tr("6 tháng gần nhất, tính theo ngày bắt đầu")}
        empty={noMonths ? <EmptyChart title={tr("Chưa có kỳ thi nào")} text="" /> : null}
      >
        <div role="img" aria-label={months.map((item) => `${item.name}: ${item.total}`).join(", ")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={months} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <Tooltip cursor={CURSOR} formatter={(value) => [tr("{0} kỳ thi", Number(value)), ""]} separator="" />
              <Bar dataKey="total" fill={BAR_COLOR} barSize={22} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" fill="#334155" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        eyebrow={tr("Điểm số")}
        title={tr("Phân bố điểm")}
        hint={tr("Bài đã chấm, theo % điểm tối đa")}
        empty={noScores ? <EmptyChart title={tr("Chưa có bài đã chấm")} text={tr("Kết quả sẽ hiện ở đây khi có thí sinh nộp bài và được chấm.")} /> : null}
      >
        <div role="img" aria-label={scores.map((item) => `${item.name}: ${item.total}`).join(", ")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={scores} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#EEF2F7" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
              <Tooltip cursor={CURSOR} formatter={(value) => [tr("{0} bài", Number(value)), ""]} separator="" />
              <Bar dataKey="total" fill={BAR_COLOR} barSize={28} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" fill="#334155" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </section>
    </>
  );
}
