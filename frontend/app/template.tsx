"use client";

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <div className="pageTransition">{children}</div>;
}
