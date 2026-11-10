"use client";


import { tr } from "../lib/i18n";
import { useEffect, useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { api } from "../lib/api-client";
import { useServerSort } from "../lib/use-server-sort";
import { metaOf, type PaginatedResponse } from "../lib/pagination";
import type { Question, Subject, Topic } from "../lib/types";
import { DataTable } from "./DataTable";
import { FilterSelect, TableToolbar } from "./TableToolbar";

const PAGE_SIZES = [10, 25, 50];
const DIFFICULTY_LABEL: Record<string, string> = { get easy() { return tr("Dễ"); }, get medium() { return tr("Trung bình"); }, get hard() { return tr("Khó"); } };
/** "Chọn tất cả kết quả" never loads more than this, so a huge bank cannot freeze the page. */
const SELECT_ALL_LIMIT = 500;

interface Props {
  /** Questions currently ticked, in the order they were picked (that becomes the exam order). */
  selected: Question[];
  onChange: (selected: Question[]) => void;
  /** Questions the exam already has: shown as such and never added twice. */
  alreadyIds?: number[];
}

/**
 * Pick approved questions from the question bank by category (môn học → chủ đề): a table with a checkbox per row,
 * search, filters and paging. Ticks survive paging and filtering, and "Chọn tất cả" can take every match.
 */
export function QuestionPicker({ selected, onChange, alreadyIds = [] }: Props) {
  const [rows, setRows] = useState<Question[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: PAGE_SIZES[0], total: 0 });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PAGE_SIZES[0]);
  const [loading, setLoading] = useState(true);
  const [selectingAll, setSelectingAll] = useState(false);
  const serverSort = useServerSort(() => setPage(1));

  const selectedIds = new Set(selected.map((question) => question.id));
  const already = useMemo(() => new Set(alreadyIds), [alreadyIds]);
  const topicOptions = useMemo(() => topics.filter((topic) => !subjectId || String(topic.subject_id) === subjectId), [topics, subjectId]);

  useEffect(() => {
    api
      .get<{ data: Subject[] }>("/subjects", { per_page: 100 })
      .then((response) => setSubjects(response.data))
      .catch(() => setSubjects([]));
    api
      .get<{ data: Topic[] }>("/topics", { per_page: 100 })
      .then((response) => setTopics(response.data))
      .catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, subjectId, topicId, difficulty, perPage]);

  const filters = { status: "approved", search: debouncedSearch, subject_id: subjectId, topic_id: topicId, difficulty, ...serverSort.params };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<PaginatedResponse<Question>>("/questions", { ...filters, page, per_page: perPage })
      .then((response) => {
        if (cancelled) return;
        setRows(response.data);
        setMeta(metaOf(response));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, subjectId, topicId, difficulty, page, perPage, serverSort.params]);

  function toggle(question: Question) {
    onChange(selectedIds.has(question.id) ? selected.filter((item) => item.id !== question.id) : [...selected, question]);
  }

  /** Ticks every question matching the current filters, across all pages. */
  async function selectAllMatching() {
    setSelectingAll(true);
    try {
      const collected: Question[] = [];
      for (let next = 1; collected.length < Math.min(meta.total, SELECT_ALL_LIMIT); next += 1) {
        const response = await api.get<PaginatedResponse<Question>>("/questions", { ...filters, page: next, per_page: 100 });
        collected.push(...response.data);
        if (response.data.length < 100) break;
      }
      const fresh = collected.slice(0, SELECT_ALL_LIMIT).filter((question) => !selectedIds.has(question.id));
      onChange([...selected, ...fresh]);
    } finally {
      setSelectingAll(false);
    }
  }

  const hasFilters = Boolean(search.trim() || subjectId || topicId || difficulty);
  const clearFilters = () => {
    setSearch("");
    setSubjectId("");
    setTopicId("");
    setDifficulty("");
  };

  return (
    <div>
      <TableToolbar
        search={{ value: search, onChange: setSearch, placeholder: tr("Tìm nội dung câu hỏi…"), label: tr("Tìm câu hỏi") }}
        active={hasFilters}
        onReset={clearFilters}
        end={
          meta.total > 0 ? (
            <button className="approveButton" type="button" onClick={selectAllMatching} disabled={selectingAll}>
              <ListChecks size={16} aria-hidden="true" />
              {selectingAll ? tr("Đang chọn…") : tr("Chọn cả {0} câu phù hợp", Math.min(meta.total, SELECT_ALL_LIMIT))}
            </button>
          ) : null
        }
      >
        <FilterSelect
          label={tr("Môn học")}
          value={subjectId}
          onChange={(value) => {
            setSubjectId(value);
            setTopicId(""); // the old topic may belong to another subject
          }}
          options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
          allLabel={tr("Tất cả môn")}
        />
        <FilterSelect label={tr("Chủ đề")} value={topicId} onChange={setTopicId} options={topicOptions.map((topic) => ({ value: String(topic.id), label: topic.name }))} allLabel={tr("Tất cả chủ đề")} />
        <FilterSelect
          label={tr("Độ khó")}
          value={difficulty}
          onChange={setDifficulty}
          options={Object.entries(DIFFICULTY_LABEL).map(([value, label]) => ({ value, label }))}
          allLabel={tr("Mọi độ khó")}
        />
      </TableToolbar>

      <DataTable
        label={tr("Câu hỏi trong ngân hàng")}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        filtered={hasFilters}
        searchTerm={debouncedSearch}
        onClearFilters={clearFilters}
        emptyMessage={tr("Không có câu hỏi đã duyệt phù hợp")}
        emptyHint={tr("Chỉ câu hỏi đã được duyệt mới chọn được vào đề.")}
        columns={[
          {
            key: "text",
            sortKey: "question_text",
            header: tr("Câu hỏi"),
            render: (row) => (
              <div style={{ maxWidth: 520 }}>
                {row.question_text}
                {already.has(row.id) ? (
                  <div>
                    <span className="badge green">{tr("Đã có trong đề")}</span>
                  </div>
                ) : null}
              </div>
            )
          },
          { key: "topic", header: tr("Danh mục"), render: (row) => row.topic_name ?? "—" },
          { key: "difficulty", header: tr("Độ khó"), render: (row) => <span className="badge blue">{DIFFICULTY_LABEL[row.difficulty] ?? row.difficulty}</span> }
        ]}
        pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage, onPerPageChange: setPerPage, pageSizes: PAGE_SIZES }}
        sort={serverSort.sort}
        selection={{
          selectedIds,
          getId: (row) => row.id,
          onToggle: (id) => {
            const question = rows.find((row) => row.id === id) ?? selected.find((item) => item.id === id);
            if (question) toggle(question);
          },
          onToggleAll: (checked) => {
            if (checked) {
              onChange([...selected, ...rows.filter((row) => !selectedIds.has(row.id))]);
            } else {
              const pageIds = new Set(rows.map((row) => row.id));
              onChange(selected.filter((item) => !pageIds.has(item.id)));
            }
          },
          onClear: () => onChange([])
        }}
      />
    </div>
  );
}
