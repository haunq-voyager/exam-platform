"use client";

import { FormEvent, useMemo, useState } from "react";
import { Camera, CheckCircle2, LockKeyhole, Save, UserRound } from "lucide-react";
import { useAuth } from "../../../lib/auth-context";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const avatarLabel = useMemo(() => initials(name || user?.name || "EH"), [name, user?.name]);

  function handleAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUrl(URL.createObjectURL(file));
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
          <p className="eyebrow">Cài đặt tài khoản</p>
          <h2>Quản lý hồ sơ cá nhân</h2>
          <p>Cập nhật avatar, thông tin liên hệ và mật khẩu đăng nhập của bạn.</p>
        </div>
      </section>

      <section className="settingsGrid">
        <article className="modernCard profileCard">
          <div className="modernCardHeader">
            <div>
              <p className="eyebrow">Hồ sơ</p>
              <h3>Thông tin cá nhân</h3>
            </div>
            <UserRound size={22} />
          </div>

          <form onSubmit={handleSubmit} className="settingsForm">
            <div className="avatarUpload">
              <div className="largeAvatar">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar người dùng" /> : <span>{avatarLabel}</span>}
              </div>
              <label className="uploadButton">
                <Camera size={16} />
                Upload ảnh
                <input type="file" accept="image/*" onChange={handleAvatar} />
              </label>
            </div>

            <label className="field">
              Họ tên
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </label>
            <label className="field">
              Số điện thoại
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" />
            </label>

            <button className="primaryButton" type="submit">
              <Save size={16} />
              Lưu thay đổi
            </button>
            {saved ? (
              <span className="saveHint">
                <CheckCircle2 size={15} />
                Đã lưu trên giao diện demo.
              </span>
            ) : null}
          </form>
        </article>

        <article className="modernCard" id="password">
          <div className="modernCardHeader">
            <div>
              <p className="eyebrow">Bảo mật</p>
              <h3>Đổi mật khẩu</h3>
            </div>
            <LockKeyhole size={22} />
          </div>

          <form onSubmit={handlePassword} className="settingsForm">
            <label className="field">
              Mật khẩu hiện tại
              <input type="password" placeholder="Nhập mật khẩu hiện tại" />
            </label>
            <label className="field">
              Mật khẩu mới
              <input type="password" placeholder="Nhập mật khẩu mới" />
            </label>
            <label className="field">
              Nhập lại mật khẩu mới
              <input type="password" placeholder="Nhập lại mật khẩu mới" />
            </label>
            <button className="primaryButton" type="submit">
              <LockKeyhole size={16} />
              Cập nhật mật khẩu
            </button>
            {passwordSaved ? (
              <span className="saveHint">
                <CheckCircle2 size={15} />
                Đã ghi nhận yêu cầu đổi mật khẩu trên giao diện demo.
              </span>
            ) : null}
          </form>
        </article>
      </section>
    </div>
  );
}
