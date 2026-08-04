"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api-client";
import { ATTEMPT_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { ExamAttempt } from "../../../lib/types";

const STATUS_BADGE: Record<string, string> = { in_progress: "amber", submitted: "blue", graded: "green" };

export default function ResultsPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ExamAttempt[] }>("/exam-attempts")
      .then((response) => setAttempts(response.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Thí sinh</p>
          <h1>Kết quả làm bài</h1>
        </div>
      </header>

      <section className="panel">
        {loading ? (
          <div className="emptyState">Đang tải...</div>
        ) : attempts.length === 0 ? (
          <div className="emptyState">Bạn chưa làm bài thi nào.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Đề thi</th>
                <th>Trạng thái</th>
                <th>Điểm</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.exam_title}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[attempt.status]}`}>{statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span>
                  </td>
                  <td>{attempt.score !== null ? `${attempt.score} / ${attempt.total_points}` : "—"}</td>
                  <td>
                    <Link className="linkButton" href={`/dashboard/results/${attempt.id}`}>
                      Xem chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
