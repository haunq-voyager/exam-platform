"use client";


import { tr } from "../../../lib/i18n";
import { FormEvent, useState } from "react";
import { Camera, CheckCircle2, LockKeyhole, Save, Trash2, UserRound } from "lucide-react";
import { Avatar } from "../../../components/Avatar";
import { api, ApiError } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import { useToast } from "../../../lib/toast";
import type { User } from "../../../lib/types";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export default function AccountSettingsPage() {
  const { user, setCurrentUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // lets the same file be picked again after an error
    if (!file) return;

    setAvatarError(null);
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError(tr("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP."));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError(tr("Ảnh quá lớn, vui lòng chọn ảnh tối đa 2MB."));
      return;
    }

    const form = new FormData();
    form.append("avatar", file);
    setAvatarBusy(true);
    try {
      const response = await api.postForm<{ data: User }>("/me/avatar", form);
      setCurrentUser(response.data);
      showToast(tr("Đã cập nhật ảnh đại diện."));
    } catch (err) {
      const detail = err instanceof ApiError ? (err.errors?.avatar?.[0] ?? err.message) : null;
      setAvatarError(detail ?? tr("Không thể tải ảnh lên, vui lòng thử lại."));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const response = await api.delete<{ data: User }>("/me/avatar");
      setCurrentUser(response.data);
      showToast(tr("Đã xóa ảnh đại diện."));
    } catch {
      setAvatarError(tr("Không thể xóa ảnh, vui lòng thử lại."));
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaved(true);
  }

  if (!user) return null;

  return (
    <div className="settingsPage">
      <section className="dashboardHero">
        <div>
          <p className="eyebrow">{tr("Cài đặt tài khoản")}</p>
          <h2>{tr("Quản lý hồ sơ cá nhân")}</h2>
          <p>{tr("Cập nhật avatar, thông tin liên hệ và mật khẩu đăng nhập của bạn.")}</p>
        </div>
      </section>

      <section className="settingsGrid">
        <article className="modernCard profileCard">
          <div className="modernCardHeader">
            <div>
              <p className="eyebrow">{tr("Hồ sơ")}</p>
              <h3>{tr("Thông tin cá nhân")}</h3>
            </div>
            <UserRound size={22} />
          </div>

          <form onSubmit={handleSubmit} className="settingsForm">
            <div className="avatarUpload">
              <Avatar className="largeAvatar" name={user.name} url={user.avatar_url} />
              <div className="avatarActions">
                <div className="controlRow">
                  <label className={avatarBusy ? "uploadButton busy" : "uploadButton"}>
                    <Camera size={16} />
                    {avatarBusy ? tr("Đang tải lên...") : user.avatar_url ? tr("Đổi ảnh") : tr("Upload ảnh")}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar} disabled={avatarBusy} />
                  </label>
                  {user.avatar_url ? (
                    <button type="button" className="linkButton" onClick={handleRemoveAvatar} disabled={avatarBusy} title={tr("Xóa ảnh đại diện")}>
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
                <span className="avatarHint">{tr("JPG, PNG hoặc WebP, tối đa 2MB.")}</span>
                {avatarError ? <span className="formError">{avatarError}</span> : null}
              </div>
            </div>

            <label className="field">
              {tr("Họ tên")}
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              {tr("Email")}
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="field">
              {tr("Số điện thoại")}
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={tr("Nhập số điện thoại")} />
            </label>

            <button className="primaryButton" type="submit">
              <Save size={16} />
              {tr("Lưu thay đổi")}
            </button>
            {saved ? (
              <span className="saveHint">
                <CheckCircle2 size={15} />
                {tr("Đã lưu trên giao diện demo.")}
              </span>
            ) : null}
          </form>
        </article>

        <article className="modernCard" id="password">
          <div className="modernCardHeader">
            <div>
              <p className="eyebrow">{tr("Bảo mật")}</p>
              <h3>{tr("Đổi mật khẩu")}</h3>
            </div>
            <LockKeyhole size={22} />
          </div>

          <form onSubmit={handlePassword} className="settingsForm">
            <label className="field">
              {tr("Mật khẩu hiện tại")}
              <input type="password" placeholder={tr("Nhập mật khẩu hiện tại")} />
            </label>
            <label className="field">
              {tr("Mật khẩu mới")}
              <input type="password" placeholder={tr("Nhập mật khẩu mới")} />
            </label>
            <label className="field">
              {tr("Nhập lại mật khẩu mới")}
              <input type="password" placeholder={tr("Nhập lại mật khẩu mới")} />
            </label>
            <button className="primaryButton" type="submit">
              <LockKeyhole size={16} />
              {tr("Cập nhật mật khẩu")}
            </button>
            {passwordSaved ? (
              <span className="saveHint">
                <CheckCircle2 size={15} />
                {tr("Đã ghi nhận yêu cầu đổi mật khẩu trên giao diện demo.")}
              </span>
            ) : null}
          </form>
        </article>
      </section>
    </div>
  );
}
