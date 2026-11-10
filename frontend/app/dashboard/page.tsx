"use client";


import { tr } from "../../lib/i18n";
import { formatDateTime } from "../../lib/format-date";
import { useEffect, useMemo, useState } from "react";
import Link from "@/components/RoleLink";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Medal,
  Sparkles,
  Trophy,
  Users
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api-client";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, statusLabel } from "../../lib/status-labels";
import { can, canAny } from "../../lib/permissions";
import { StaffCharts } from "../../components/StaffCharts";
import type { Exam, ExamAttempt, Question, StudentExam, User, Workload } from "../../lib/types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#6366F1",
  open: "#06B6D4",
  closed: "#94A3B8",
  graded: "#22C55E"
};

const UNSCHEDULED = "unknown";
const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1));

/** Year / month of an exam's start (local time, same as what is displayed); "unknown" when it has no schedule. */
function examYear(value: string | null): string {
  return value ? String(new Date(value).getFullYear()) : UNSCHEDULED;
}

function examMonth(value: string | null): string {
  return value ? String(new Date(value).getMonth() + 1) : UNSCHEDULED;
}

function periodLabel(year: string, month: string): string {
  if (year === UNSCHEDULED) return tr("Chưa có lịch");
  if (year === "all" && month === "all") return tr("Tất cả thời gian");
  if (month === "all") return tr("Năm {0}", year);
  return year === "all" ? tr("Tháng {0}", month) : tr("Tháng {0}/{1}", month, year);
}

function formatDate(value: string | null | undefined): string {
  return value ? formatDateTime(value) : tr("Chưa có thời gian");
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  hint: string;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <article className={`saasStatCard ${tone}`}>
      <div className="saasStatIcon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function EmptyDashboardState() {
  return (
    <div className="modernEmpty">
      <span>
        <Sparkles size={26} />
      </span>
      <h3>{tr("Chưa có dữ liệu để thống kê")}</h3>
      <p>{tr("Khi bạn được gán kỳ thi hoặc hoàn thành bài làm, biểu đồ và hoạt động gần đây sẽ tự động xuất hiện ở đây.")}</p>
      <Link className="primaryButton" href="/dashboard/student-exams">
        {tr("Xem đề thi")}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [exams, setExams] = useState<Exam[]>([]);
  const [openSessionCount, setOpenSessionCount] = useState(0);
  const [studentExams, setStudentExams] = useState<StudentExam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [workload, setWorkload] = useState<Workload | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        if (user!.role !== "student") {
          // Each figure is only requested when the role may see it (a department head has no question bank access).
          const total = (response: unknown, fallback: number) => (response as { meta?: { total?: number } }).meta?.total ?? fallback;
          const me = user!;
          if (can(me, "users.view")) {
            const response = await api.get<{ data: User[] }>("/users", { per_page: 1 });
            setUserCount(total(response, response.data.length));
          }
          if (can(me, "questions.manage")) {
            const response = await api.get<{ data: Question[] }>("/questions", { per_page: 1 });
            setQuestionCount(total(response, response.data.length));
          }
          if (can(me, "exams.manage")) {
            const response = await api.get<{ data: Exam[] }>("/exams");
            setExams(response.data);
          }
          if (canAny(me, "sessions.proctor", "regrades.review", "feedback.respond")) {
            const response = await api.get<{ data: Workload }>("/workload");
            setWorkload(response.data);
          }
          if (canAny(me, "sessions.view", "sessions.create", "sessions.update")) {
            const response = await api.get<{ data: unknown[] }>("/exam-sessions", { status: "open", per_page: 1 });
            setOpenSessionCount(total(response, response.data.length));
          }
        } else {
          const [studentExamResponse, attemptsResponse] = await Promise.all([
            api.get<{ data: StudentExam[] }>("/student/exams"),
            api.get<{ data: ExamAttempt[] }>("/exam-attempts")
          ]);
          setStudentExams(studentExamResponse.data);
          setAttempts(attemptsResponse.data);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // Years that actually have exams (newest first); "unknown" is kept last for exams without a schedule.
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(studentExams.map((exam) => examYear(exam.start_at))));
    return years.filter((year) => year !== UNSCHEDULED).sort().reverse().concat(years.includes(UNSCHEDULED) ? [UNSCHEDULED] : []);
  }, [studentExams]);

  const filteredStudentExams = useMemo(() => {
    return studentExams.filter(
      (exam) =>
        (yearFilter === "all" || examYear(exam.start_at) === yearFilter) &&
        (monthFilter === "all" || examMonth(exam.start_at) === monthFilter)
    );
  }, [yearFilter, monthFilter, studentExams]);

  const completedExams = useMemo(() => filteredStudentExams.filter((exam) => exam.my_attempt_status === "graded"), [filteredStudentExams]);

  const averageScore = useMemo(() => {
    if (completedExams.length === 0) return "—";
    const average = completedExams.reduce((sum, exam) => sum + Number(exam.my_score ?? 0), 0) / completedExams.length;
    return average.toFixed(1);
  }, [completedExams]);

  const statusData = useMemo(() => {
    return ["scheduled", "open", "closed", "graded"]
      .map((status) => ({
        key: status,
        name: status === "graded" ? tr("Đã chấm") : statusLabel(EXAM_STATUS_LABEL, status),
        value: filteredStudentExams.filter((exam) => (status === "graded" ? exam.my_attempt_status === "graded" : exam.status === status)).length
      }))
      .filter((item) => item.value > 0);
  }, [filteredStudentExams]);

  const scoreData = useMemo(() => {
    return attempts
      .filter((attempt) => attempt.score !== null)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((attempt, index) => ({
        label: tr("Lần {0}", index + 1),
        score: Number(attempt.score ?? 0),
        date: formatDate(attempt.started_at)
      }));
  }, [attempts]);

  const activities = useMemo(() => {
    const fromAttempts = attempts.slice(0, 5).map((attempt) => ({
      id: `attempt-${attempt.id}`,
      title: attempt.status === "graded" ? tr("Đã có kết quả bài thi") : tr("Cập nhật lượt làm bài"),
      description: `${attempt.exam_title ?? tr("Bài thi")} · ${statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}`,
      time: formatDate(attempt.submitted_at ?? attempt.started_at),
      tone: attempt.status === "graded" ? "green" : "blue"
    }));

    const fromExams = filteredStudentExams.slice(0, 3).map((exam) => ({
      id: `exam-${exam.id}`,
      title: exam.status === "open" ? tr("Kỳ thi đang mở") : tr("Kỳ thi được giao"),
      description: `${exam.title} · ${statusLabel(EXAM_STATUS_LABEL, exam.status)}`,
      time: formatDate(exam.start_at),
      tone: exam.status === "open" ? "blue" : "violet"
    }));

    return [...fromAttempts, ...fromExams].slice(0, 6);
  }, [attempts, filteredStudentExams]);

  if (!user) return null;

  if (loading) {
    return <div className="modernEmpty">{tr("Đang tải dữ liệu...")}</div>;
  }

  if (user.role !== "student") {
    return (
      <div className="modernDashboard">
        <section className="dashboardHero">
          <div>
            <p className="eyebrow">{tr("ExamHub overview")}</p>
            <h2>{user.role === "admin" ? tr("Toàn cảnh vận hành hệ thống") : user.role === "teacher" ? tr("Việc cần xử lý hôm nay") : tr("Toàn cảnh công việc của bạn")}</h2>
            <p>{user.role === "teacher" ? tr("Các kỳ thi bạn được phân công: thí sinh đang làm bài, yêu cầu phúc khảo và phản hồi cần trả lời.") : tr("Theo dõi ngân hàng câu hỏi, đề thi và các kỳ thi đang diễn ra chỉ trong một màn hình.")}</p>
          </div>
        </section>

        <section className="saasStatsGrid">
          {can(user, "users.view") ? <StatCard icon={Users} label={tr("Người dùng")} value={userCount} hint={tr("Tài khoản trong hệ thống")} tone="blue" /> : null}
          {can(user, "questions.manage") ? <StatCard icon={FileQuestion} label={tr("Câu hỏi")} value={questionCount} hint={tr("Ngân hàng hiện có")} tone="violet" /> : null}
          {can(user, "exams.manage") ? <StatCard icon={ClipboardList} label={tr("Đề thi")} value={exams.length} hint={tr("Đề đã tạo")} tone="green" /> : null}
          {canAny(user, "sessions.view", "sessions.create", "sessions.update") ? <StatCard icon={AlertTriangle} label={tr("Kỳ thi đang mở")} value={openSessionCount} hint={tr("Cần theo dõi")} tone="amber" /> : null}
          {workload && can(user, "sessions.proctor") ? <StatCard icon={AlertTriangle} label={tr("Đang làm bài")} value={workload.in_progress_attempts} hint={tr("{0} kỳ thi bạn coi", workload.running_sessions)} tone="green" /> : null}
          {workload && can(user, "regrades.review") ? <StatCard icon={ClipboardList} label={tr("Phúc khảo chờ xử lý")} value={workload.pending_regrades} hint={tr("Yêu cầu của thí sinh")} tone="violet" /> : null}
          {workload && can(user, "feedback.respond") ? <StatCard icon={FileQuestion} label={tr("Phản hồi chưa trả lời")} value={workload.unanswered_feedback} hint={tr("Từ thí sinh")} tone="blue" /> : null}
        </section>

        {canAny(user, "sessions.view", "sessions.proctor", "regrades.review", "feedback.respond") ? <StaffCharts /> : null}
      </div>
    );
  }

  const hasData = filteredStudentExams.length > 0 || attempts.length > 0;

  return (
    <div className="modernDashboard">
      <section className="dashboardHero">
        <div>
          <p className="eyebrow">{tr("ExamHub overview")}</p>
          <h2>{tr("Theo dõi kỳ thi, điểm số và tiến trình học tập")}</h2>
          <p>{tr("Một dashboard gọn, sáng và tập trung vào việc bạn cần làm tiếp theo.")}</p>
        </div>
        <div className="periodFilters">
          <label className="field compactMonth">
            {tr("Năm")}
            <select
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(event.target.value);
                if (event.target.value === UNSCHEDULED) setMonthFilter("all");
              }}
            >
              <option value="all">{tr("Tất cả năm")}</option>
              {availableYears.map((year) => (
                <option value={year} key={year}>
                  {year === UNSCHEDULED ? tr("Chưa có lịch") : tr("Năm {0}", year)}
                </option>
              ))}
            </select>
          </label>
          <label className="field compactMonth">
            {tr("Tháng")}
            <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} disabled={yearFilter === UNSCHEDULED}>
              <option value="all">{tr("Tất cả tháng")}</option>
              {MONTHS.map((month) => (
                <option value={month} key={month}>
                  {tr("Tháng")} {month}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {!hasData ? (
        <EmptyDashboardState />
      ) : (
        <>
          <section className="saasStatsGrid">
            <StatCard icon={CalendarDays} label={tr("Kỳ thi")} value={filteredStudentExams.length} hint={periodLabel(yearFilter, monthFilter)} tone="blue" />
            <StatCard icon={ClipboardList} label={tr("Đang mở")} value={filteredStudentExams.filter((exam) => exam.status === "open").length} hint={tr("Có thể vào thi")} tone="violet" />
            <StatCard icon={Trophy} label={tr("Đã thi")} value={completedExams.length} hint={tr("Đã có kết quả")} tone="green" />
            <StatCard icon={Medal} label={tr("Điểm TB")} value={averageScore} hint={tr("Theo lịch sử điểm")} tone="amber" />
          </section>

          <section className="analyticsGrid">
            <article className="modernCard">
              <div className="modernCardHeader">
                <div>
                  <p className="eyebrow">{tr("Trạng thái")}</p>
                  <h3>{tr("Phân bố kỳ thi")}</h3>
                </div>
              </div>
              {statusData.length === 0 ? (
                <EmptyDashboardState />
              ) : (
                <div className="donutWrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={96} paddingAngle={4}>
                        {statusData.map((entry) => (
                          <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="chartLegend">
                    {statusData.map((item) => (
                      <span key={item.key}>
                        <i style={{ background: STATUS_COLORS[item.key] }} />
                        {item.name}: {item.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            <article className="modernCard">
              <div className="modernCardHeader">
                <div>
                  <p className="eyebrow">{tr("Điểm số")}</p>
                  <h3>{tr("Điểm theo thời gian")}</h3>
                </div>
              </div>
              {scoreData.length === 0 ? (
                <div className="miniEmpty">
                  <CheckCircle2 size={24} />
                  <strong>{tr("Chưa có điểm lịch sử")}</strong>
                  <span>{tr("Hoàn thành bài thi đầu tiên để biểu đồ xuất hiện.")}</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <RechartsLineChart data={scoreData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#EEF2F7" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""} />
                    <Line type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: "#4F46E5" }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
            </article>
          </section>

          <section className="analyticsGrid lower">
            <article className="modernCard">
              <div className="modernCardHeader">
                <div>
                  <p className="eyebrow">{tr("Hoạt động")}</p>
                  <h3>{tr("Hoạt động gần đây")}</h3>
                </div>
              </div>
              <div className="activityFeed">
                {activities.length === 0 ? (
                  <div className="miniEmpty">{tr("Chưa có hoạt động mới.")}</div>
                ) : (
                  activities.map((activity) => (
                    <div className={`activityItem ${activity.tone}`} key={activity.id}>
                      <i />
                      <div>
                        <strong>{activity.title}</strong>
                        <span>{activity.description}</span>
                      </div>
                      <time>{activity.time}</time>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="modernCard nextExamCard">
              <div className="modernCardHeader">
                <div>
                  <p className="eyebrow">{tr("Tiếp theo")}</p>
                  <h3>{tr("Kỳ thi cần chú ý")}</h3>
                </div>
                <Link className="linkButton" href="/dashboard/student-exams">
                  {tr("Xem tất cả")}
                </Link>
              </div>
              <div className="examMiniList">
                {filteredStudentExams.slice(0, 4).map((exam) => (
                  <Link href={`/dashboard/student-exams/${exam.id}`} className="examMiniItem" key={exam.id}>
                    <span>{exam.title}</span>
                    <small>
                      {exam.question_count} {tr("câu ·")} {statusLabel(EXAM_STATUS_LABEL, exam.status)}
                    </small>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
