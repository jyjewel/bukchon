import { supabase } from "./supabase";
import { dateLabel } from "./time";

/** 텍스트 파일(.md/.txt)로 내려받는다 */
export function downloadText(filename: string, text: string) {
  const blob = new Blob(["﻿" + text], { type: "text/markdown;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const t = document.createElement("textarea");
      t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      const ok = document.execCommand("copy");
      t.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export const todayStamp = () => new Date().toISOString().slice(0, 10);
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60) || "기록";

/** 1000개씩 끊어서 전부 가져온다 */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export interface ExportOptions { journal: boolean; notes: boolean; diary: boolean; from?: string; to?: string }
export interface ExportResult { text: string; counts: { journal: number; notes: number; diary: number } }

/** 일지·연구노트·다이어리를 하나의 마크다운 문서로 만든다 (날짜 범위는 선택) */
export async function buildExport(userId: string, opt: ExportOptions): Promise<ExportResult> {
  const sb = supabase();
  const parts: string[] = [];
  const counts = { journal: 0, notes: 0, diary: 0 };
  const inRange = (day: string) => (!opt.from || day >= opt.from) && (!opt.to || day <= opt.to);

  if (opt.journal) {
    const rows = await fetchAll<{ log_date: string; body: string }>((a, b) =>
      sb.from("daily_logs").select("log_date, body").eq("user_id", userId).neq("body", "").order("log_date").range(a, b));
    const list = rows.filter((x) => inRange(x.log_date));
    counts.journal = list.length;
    if (list.length) parts.push("# 오늘의 일지\n\n" + list.map((x) => `## ${x.log_date} (${dateLabel(x.log_date)})\n\n${x.body.trim()}\n`).join("\n"));
  }
  if (opt.notes) {
    const rows = await fetchAll<{ category: string; title: string; body: string; created_at: string; updated_at: string }>((a, b) =>
      sb.from("research_notes").select("category, title, body, created_at, updated_at").eq("user_id", userId).order("category").order("created_at").range(a, b));
    const list = rows.filter((x) => inRange(x.created_at.slice(0, 10)));
    counts.notes = list.length;
    if (list.length) {
      const cats = [...new Set(list.map((x) => x.category))];
      parts.push("# 연구노트\n\n" + cats.map((c) => `## ${c}\n\n` + list.filter((x) => x.category === c).map((x) => `### ${x.title || "(제목 없음)"}\n_${x.created_at.slice(0, 10)} 작성 · ${x.updated_at.slice(0, 10)} 수정_\n\n${x.body.trim()}\n`).join("\n")).join("\n"));
    }
  }
  if (opt.diary) {
    const rows = await fetchAll<{ kind: string; title: string; body: string; link_url: string; created_at: string }>((a, b) =>
      sb.from("diary_entries").select("kind, title, body, link_url, created_at").eq("author_id", userId).order("created_at").range(a, b));
    const list = rows.filter((x) => inRange(x.created_at.slice(0, 10)));
    counts.diary = list.length;
    const kindName: Record<string, string> = { daily: "일상", reading: "독서 기록", progress: "연구 진행", writing: "논문 작성" };
    if (list.length) parts.push("# 다이어리\n\n" + list.map((x) => `## ${x.created_at.slice(0, 10)} · ${kindName[x.kind] ?? x.kind}${x.title ? ` · ${x.title}` : ""}\n\n${x.body.trim()}${x.link_url ? `\n\n링크: ${x.link_url}` : ""}\n`).join("\n"));
  }
  const head = `<!-- 연구자 마을 기록 내보내기 · ${new Date().toLocaleString("ko-KR")} -->\n\n`;
  return { text: head + parts.join("\n\n---\n\n"), counts };
}
