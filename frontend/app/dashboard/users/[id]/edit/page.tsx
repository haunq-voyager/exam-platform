"use client";


import { tr } from "../../../../../lib/i18n";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/use-role-router";
import { api } from "../../../../../lib/api-client";
import { useBreadcrumbLabel } from "../../../../../components/Breadcrumbs";
import { PageHeader } from "../../../../../components/PageHeader";
import { UserForm, userPayload, valuesFromUser } from "../../../../../components/UserForm";
import { useToast } from "../../../../../lib/toast";
import type { User } from "../../../../../lib/types";

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.get<{ data: User }>(`/users/${params.id}`).then((response) => setUser(response.data));
  }, [params.id]);

  useBreadcrumbLabel(user?.name);

  if (!user) {
    return <div className="emptyState" role="status">{tr("Đang tải…")}</div>;
  }

  return (
    <>
      <PageHeader eyebrow={tr("Quản trị")} title={tr("Sửa người dùng")} description={`${user.name} · ${user.email}`} />
      <section className="panel" style={{ maxWidth: 760 }}>
        <UserForm
          mode="edit"
          initial={valuesFromUser(user)}
          submitLabel={tr("Lưu thay đổi")}
          onSubmit={async (values) => {
            await api.patch(`/users/${params.id}`, userPayload(values, "edit"));
            showToast(tr("Đã lưu thay đổi người dùng."));
            router.push("/dashboard/users");
          }}
        />
      </section>
    </>
  );
}
