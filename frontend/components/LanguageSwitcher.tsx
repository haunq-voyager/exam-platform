"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LANGS, tr, type Lang } from "../lib/i18n";
import { useI18n } from "../lib/i18n-provider";

/** Inline SVG flags: emoji flags render as plain letters on Windows. */
function Flag({ code }: { code: Lang }) {
  return (
    <svg className="langFlag" viewBox={code === "vi" ? "0 0 30 20" : "0 0 60 40"} width="24" height="16" aria-hidden="true" focusable="false">
      {code === "vi" ? (
        <>
          <rect width="30" height="20" fill="#da251d" />
          <polygon fill="#ffff00" points="15,4 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15" />
        </>
      ) : (
        <>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" strokeWidth="8" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#c8102e" strokeWidth="3" />
          <path d="M30,0 V40 M0,20 H60" stroke="#ffffff" strokeWidth="13" />
          <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="8" />
        </>
      )}
    </svg>
  );
}

/** Flag dropdown for the interface language; the choice is remembered in the browser. */
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = LANGS.find((item) => item.code === lang) ?? LANGS[0];

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="langWrap" ref={wrapRef}>
      <button type="button" className="langButton" aria-haspopup="listbox" aria-expanded={open} aria-label={`${tr("Ngôn ngữ")}: ${current.name}`} onClick={() => setOpen((value) => !value)}>
        <Flag code={current.code} />
        <span>{current.label}</span>
        <ChevronDown size={14} aria-hidden="true" className="langChevron" />
      </button>
      {open ? (
        <ul className="langMenu" role="listbox" aria-label={tr("Ngôn ngữ")}>
          {LANGS.map((item) => (
            <li key={item.code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={item.code === lang}
                lang={item.code}
                className={item.code === lang ? "langOption active" : "langOption"}
                onClick={() => {
                  setOpen(false);
                  if (item.code !== lang) setLang(item.code);
                }}
              >
                <Flag code={item.code} />
                <span>{item.name}</span>
                {item.code === lang ? <Check size={14} aria-hidden="true" className="langCheck" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
