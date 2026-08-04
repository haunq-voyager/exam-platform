"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import type { Exam, ExamAttempt, Question, StudentExam, User } from "../../lib/types";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#6366F1",
  open: "#06B6D4",
  closed: "#94A3B8",
  graded: "#22C55E"
};

function monthKey(value: string | null): string {
  if (!value) return "unknown";
  return new Date(value).toISOString().slice(0, 7);
}

function monthLabel(value: string): string {
  if (value === "all") return "Tất cả tháng";
  if (value === "unknown") return "Chưa có lịch";
  return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00`));
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Chưa có thời gian";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
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
      <h3>Chưa có dữ liệu để thống kê</h3>
      <p>Khi bạn được gán kỳ thi hoặc hoàn thành bài làm, biểu đồ và hoạt động gần đây sẽ tự động xuất hiện ở đây.</p>
      <Link className="primaryButton" href="/dashboard/student-exams">
        Xem đề thi
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
  const [studentExams, setStudentExams] = useState<StudentExam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        if (user!.role === "admin") {
          const [usersResponse, questionsResponse, examsResponse] = await Promise.all([
            api.get<{ data: User[] }>("/users"),
            api.get<{ data: Question[] }>("/questions", { per_page: 1 }),
            api.get<{ data: Exam[] }>("/exams")
          ]);
          setUserCount(usersResponse.data.length);
          setQuestionCount((questionsResponse as unknown as { meta?: { total?: number } }).meta?.total ?? questionsResponse.data.length);
          setExams(examsResponse.data);
        } else if (user!.role === "teacher") {
          const [questionsResponse, examsResponse] = await Promise.all([
            api.get<{ data: Question[] }>("/questions", { per_page: 1 }),
            api.get<{ data: Exam[] }>("/exams")
          ]);
          setQuestionCount((questionsResponse as unknown as { meta?: { total?: number } }).meta?.total ?? questionsResponse.data.length);
          setExams(examsResponse.data);
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

  const availableMonths = useMemo(() => {
    return Array.from(new Set(studentExams.map((exam) => monthKey(exam.start_at)))).sort().reverse();
  }, [studentExams]);

  const filteredStudentExams = useMemo(() => {
    return monthFilter === "all" ? studentExams : studentExams.filter((exam) => monthKey(exam.start_at) === monthFilter);
  }, [monthFilter, studentExams]);

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
        name: status === "graded" ? "Đã chấm" : statusLabel(EXAM_STATUS_LABEL, status),
        value: filteredStudentExams.filter((exam) => (status === "graded" ? exam.my_attempt_status === "graded" : exam.status === status)).length
      }))
      .filter((item) => item.value > 0);
  }, [filteredStudentExams]);

  const scoreData = useMemo(() => {
    return attempts
      .filter((attempt) => attempt.score !== null)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((attempt, index) => ({
        label: `Lần ${index + 1}`,
        score: Number(attempt.score ?? 0),
        date: formatDate(attempt.started_at)
      }));
  }, [attempts]);

  const activities = useMemo(() => {
    const fromAttempts = attempts.slice(0, 5).map((attempt) => ({
      id: `attempt-${attempt.id}`,
      title: attempt.status === "graded" ? "Đã có kết quả bài thi" : "Cập nhật lượt làm bài",
      description: `${attempt.exam_title ?? "Bài thi"} · ${statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}`,
      time: formatDate(attempt.submitted_at ?? attempt.started_at),
      tone: attempt.status === "graded" ? "green" : "blue"
    }));

    const fromExams = filteredStudentExams.slice(0, 3).map((exam) => ({
      id: `exam-${exam.id}`,
      title: exam.status === "open" ? "Kỳ thi đang mở" : "Kỳ thi được giao",
      description: `${exam.title} · ${statusLabel(EXAM_STATUS_LABEL, exam.status)}`,
      time: formatDate(exam.start_at),
      tone: exam.status === "open" ? "blue" : "violet"
    }));

    return [...fromAttempts, ...fromExams].slice(0, 6);
  }, [attempts, filteredStudentExams]);

  if (!user) return null;

  if (loading) {
    return <div className="modernEmpty">Đang tải dữ liệu...</div>;
  }

  if (user.role !== "student") {
    return (
      <>
        <section className="metricsGrid">
          {user.role === "admin" ? <StatCard icon={Users} label="Người dùng" value={userCount} hint="Tài khoản trong hệ thống" tone="blue" /> : null}
          <StatCard icon={FileQuestion} label="Câu hỏi" value={questionCount} hint="Ngân hàng hiện có" tone="violet" />
          <StatCard icon={ClipboardList} label="Đề thi" value={exams.length} hint="Đề đã tạo" tone="green" />
          <StatCard icon={AlertTriangle} label="Đề đang mở" value={exams.filter((exam) => exam.status === "open").length} hint="Cần theo dõi" tone="amber" />
        </section>
      </>
    );
  }

  const hasData = filteredStudentExams.length > 0 || attempts.length > 0;

  return (
    <div className="modernDashboard">
      <section className="dashboardHero">
        <div>
          <p className="eyebrow">ExamHub overview</p>
          <h2>Theo dõi kỳ thi, điểm số và tiến trình học tập</h2>
          <p>Một dashboard gọn, sáng và tập trung vào việc bạn cần làm tiếp theo.</p>
        </div>
        <label className="field compactMonth">
          Lọc theo tháng
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">Tất cả tháng</option>
            {availableMonths.map((month) => (
              <option value={month} key={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!hasData ? (
        <EmptyDashboardState />
      ) : (
        <>
          <section className="saasStatsGrid">
            <StatCard icon={CalendarDays} label="Kỳ thi" value={filteredStudentExams.length} hint={monthLabel(monthFilter)} tone="blue" />
            <StatCard icon={ClipboardList} label="Đang mở" value={filteredStudentExams.filter((exam) => exam.status === "open").length} hint="Có thể vào thi" tone="violet" />
            <StatCard icon={Trophy} label="Đã thi" value={completedExams.length} hint="Đã có kết quả" tone="green" />
            <StatCard icon={Medal} label="Điểm TB" value={averageScore} hint="Theo lịch sử điểm" tone="amber" />
          </section>

          <section className="analyticsGrid">
            <article className="modernCard">
              <div className="modernCardHeader">
                <div>
                  <p className="eyebrow">Trạng thái</p>
                  <h3>Phân bố kỳ thi</h3>
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
                  <p className="eyebrow">Điểm số</p>
                  <h3>Điểm theo thời gian</h3>
                </div>
              </div>
              {scoreData.length === 0 ? (
                <div className="miniEmpty">
                  <CheckCircle2 size={24} />
                  <strong>Chưa có điểm lịch sử</strong>
                  <span>Hoàn thành bài thi đầu tiên để biểu đồ xuất hiện.</span>
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
                  <p className="eyebrow">Hoạt động</p>
                  <h3>Hoạt động gần đây</h3>
                </div>
              </div>
              <div className="activityFeed">
                {activities.length === 0 ? (
                  <div className="miniEmpty">Chưa có hoạt động mới.</div>
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
                  <p className="eyebrow">Tiếp theo</p>
                  <h3>Kỳ thi cần chú ý</h3>
                </div>
                <Link className="linkButton" href="/dashboard/student-exams">
                  Xem tất cả
                </Link>
              </div>
              <div className="examMiniList">
                {filteredStudentExams.slice(0, 4).map((exam) => (
                  <Link href={`/dashboard/student-exams/${exam.id}`} className="examMiniItem" key={exam.id}>
                    <span>{exam.title}</span>
                    <small>
                      {exam.question_count} câu · {statusLabel(EXAM_STATUS_LABEL, exam.status)}
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
