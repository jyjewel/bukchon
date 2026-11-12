"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

const TONES = { rose: "#ff9fb6", mint: "#a5e3a0", sky: "#a9d8f5", butter: "#ffdf7a", lilac: "#cdb8f2" } as const;
export type Tone = keyof typeof TONES;

/** 도트 창틀 */
export function Window({
  title, tone = "rose", children, className = "", actions, as: Tag = "section",
}: {
  title: string; icon?: string; tone?: Tone; children: ReactNode; className?: string; actions?: ReactNode; as?: "section" | "div" | "aside";
}) {
  const id = useId();
  return (
    <Tag className={`window ${className}`} aria-labelledby={id}>
      <div className="titlebar" style={{ "--tb": TONES[tone] } as React.CSSProperties}>
        <h2 id={id} className="flex-1 truncate">{title}</h2>
        {actions}
      </div>
      {children}
    </Tag>
  );
}

/** 접근 가능한 모달 대화상자 (Esc·바깥 클릭으로 닫힘) */
export function Modal({
  title, tone = "sky", onClose, children, wide = false,
}: { title: string; icon?: string; tone?: Tone; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`window m-auto w-[calc(100%-1.5rem)] p-0 text-ink backdrop:bg-ink/40 ${wide ? "max-w-3xl" : "max-w-md"}`}
    >
      <div className="titlebar" style={{ "--tb": TONES[tone] } as React.CSSProperties}>
        <h2 id={id} className="flex-1 truncate">{title}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="닫기">X</button>
      </div>
      <div className="max-h-[78vh] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const style = kind === "error" ? "!bg-[#ffd9d2] [--bd:#d9547a]" : kind === "ok" ? "!bg-[#dff5d8] [--bd:#3f8a4e]" : "!bg-[#fff3c4]";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg card px-3 py-2 text-sm ${style}`}>
      {children}
    </p>
  );
}

export function Swatches({
  label, options, value, onChange,
}: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={`px-box m-[3px] h-6 w-6 ${value === c ? "outline-[3px] outline-offset-[-6px] outline-white outline-solid" : "[--bd:#d9c39a]"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function Choices<T extends string>({
  label, options, value, onChange,
}: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`btn btn-sm ${value === o.id ? "btn-primary" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
