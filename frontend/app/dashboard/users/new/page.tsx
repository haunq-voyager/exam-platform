"use client";


import { tr } from "../../../../lib/i18n";
import { useRouter } from "@/lib/use-role-router";
import { api } from "../../../../lib/api-client";
import { PageHeader } from "../../../../components/PageHeader";
import { EMPTY_USER_FORM, UserForm, userPayload } from "../../../../components/UserForm";
import { useToast } from "../../../../lib/toast";

export default function NewUserPage() {
  const router = useRouter();
  const { showToast } = useToast();

  return (
    <>
      <PageHeader eyebrow={tr("Quản trị")} title={tr("Thêm người dùng mới")} description={tr("Tạo tài khoản kèm hồ sơ cơ bản. Chỉ họ tên, email, mật khẩu và vai trò là bắt buộc.")} />
      <section className="panel" style={{ maxWidth: 760 }}>
        <UserForm
          mode="create"
          initial={{ ...EMPTY_USER_FORM, role: "student" }}
          submitLabel={tr("Tạo tài khoản")}
          onSubmit={async (values) => {
            await api.post("/users", userPayload(values, "create"));
            showToast(tr("Đã lưu tài khoản mới."));
            router.push("/dashboard/users");
          }}
        />
      </section>
    </>
  );
}
