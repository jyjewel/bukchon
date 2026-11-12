"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

const TONES = { rose: "#fbd3dc", mint: "#cfead8", sky: "#cfe4f6", butter: "#fbe9b0", lilac: "#e2d6f5" } as const;
export type Tone = keyof typeof TONES;

/** 미니홈피 풍 창틀 */
export function Window({
  title, icon, tone = "rose", children, className = "", actions, as: Tag = "section",
}: {
  title: string; icon?: string; tone?: Tone; children: ReactNode; className?: string; actions?: ReactNode; as?: "section" | "div" | "aside";
}) {
  const id = useId();
  return (
    <Tag className={`window ${className}`} aria-labelledby={id}>
      <div className="titlebar" style={{ "--tb": TONES[tone] } as React.CSSProperties}>
        {icon && <span aria-hidden>{icon}</span>}
        <h2 id={id} className="flex-1 truncate">{title}</h2>
        {actions}
      </div>
      {children}
    </Tag>
  );
}

/** 접근 가능한 모달 대화상자 (Esc·바깥 클릭으로 닫힘) */
export function Modal({
  title, icon, tone = "sky", onClose, children, wide = false,
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
        {icon && <span aria-hidden>{icon}</span>}
        <h2 id={id} className="flex-1 truncate">{title}</h2>
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      <div className="max-h-[78vh] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const style = kind === "error" ? "bg-[#ffe1dc] border-[#d9728e]" : kind === "ok" ? "bg-mint/50 border-mint-deep" : "bg-butter/60 border-line";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg border-2 border-dashed px-3 py-2 text-sm ${style}`}>
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
            className={`h-7 w-7 rounded-full border-2 ${value === c ? "border-ink ring-2 ring-rose" : "border-line"}`}
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
