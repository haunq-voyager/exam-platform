"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import type { Subject, Topic } from "../../../lib/types";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");

  const [topicSubjectId, setTopicSubjectId] = useState<number | null>(null);
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [subjectsResponse, topicsResponse] = await Promise.all([
        api.get<{ data: Subject[] }>("/subjects"),
        api.get<{ data: Topic[] }>("/topics")
      ]);
      setSubjects(subjectsResponse.data);
      setTopics(topicsResponse.data);
      if (!topicSubjectId && subjectsResponse.data.length > 0) {
        setTopicSubjectId(subjectsResponse.data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateSubject(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.post("/subjects", { name: subjectName, description: subjectDescription || null });
      setSubjectName("");
      setSubjectDescription("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo môn học.");
    }
  }

  async function handleCreateTopic(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!topicSubjectId) return;
    try {
      await api.post("/topics", { subject_id: topicSubjectId, name: topicName, description: topicDescription || null });
      setTopicName("");
      setTopicDescription("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo chủ đề.");
    }
  }

  async function handleDeleteSubject(subject: Subject) {
    if (!confirm(`Xóa môn học "${subject.name}"? Các chủ đề liên quan cũng sẽ bị xóa.`)) return;
    await api.delete(`/subjects/${subject.id}`);
    await load();
  }

  async function handleDeleteTopic(topic: Topic) {
    if (!confirm(`Xóa chủ đề "${topic.name}"?`)) return;
    await api.delete(`/topics/${topic.id}`);
    await load();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ngân hàng câu hỏi</p>
          <h1>Môn học & chủ đề</h1>
        </div>
      </header>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="contentGrid">
        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Môn học</p>
              <h2>Danh sách môn học</h2>
            </div>
          </div>
          <form onSubmit={handleCreateSubject} className="controlRow" style={{ flexWrap: "wrap" }}>
            <label className="field wide">
              <span>Tên môn học</span>
              <input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} required />
            </label>
            <label className="field wide">
              <span>Mô tả</span>
              <input value={subjectDescription} onChange={(event) => setSubjectDescription(event.target.value)} />
            </label>
            <button className="primaryButton" type="submit">
              <Plus size={16} />
              Thêm
            </button>
          </form>

          {loading ? (
            <div className="emptyState">Đang tải...</div>
          ) : (
            <div className="questionList">
              {subjects.map((subject) => (
                <div className="questionItem" key={subject.id}>
                  <div>
                    <strong>{subject.name}</strong>
                    <span>{subject.description ?? "Không có mô tả"} · {subject.topics_count ?? 0} chủ đề</span>
                  </div>
                  <button className="linkButton" onClick={() => handleDeleteSubject(subject)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Chủ đề</p>
              <h2>Danh sách chủ đề</h2>
            </div>
          </div>
          <form onSubmit={handleCreateTopic} className="controlRow" style={{ flexWrap: "wrap" }}>
            <label className="field compact" style={{ width: 160 }}>
              <span>Môn học</span>
              <select
                value={topicSubjectId ?? ""}
                onChange={(event) => setTopicSubjectId(Number(event.target.value))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field wide">
              <span>Tên chủ đề</span>
              <input value={topicName} onChange={(event) => setTopicName(event.target.value)} required />
            </label>
            <button className="primaryButton" type="submit">
              <Plus size={16} />
              Thêm
            </button>
          </form>

          {loading ? (
            <div className="emptyState">Đang tải...</div>
          ) : (
            <div className="questionList">
              {topics.map((topic) => (
                <div className="questionItem" key={topic.id}>
                  <div>
                    <strong>{topic.name}</strong>
                    <span>{topic.subject_name}</span>
                  </div>
                  <button className="linkButton" onClick={() => handleDeleteTopic(topic)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
