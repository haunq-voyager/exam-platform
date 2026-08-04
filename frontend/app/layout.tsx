import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata: Metadata = {
  title: "ExamHub",
  description: "Hệ thống thi trực tuyến tích hợp AI và camera proctoring",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
