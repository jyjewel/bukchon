// 연구자 마을 전체 기록을 JSON 과 사람이 읽을 수 있는 텍스트(.md)로 내려받는다.
// 실행: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/backup.mjs <출력 폴더>
// (서비스 키는 모든 데이터를 읽을 수 있으므로 GitHub Secrets 에만 두고, 결과 파일은 반드시 암호화해서 보관한다.)
import fs from "node:fs";
import path from "node:path";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_KEY;
const out = process.argv[2] ?? "backup-out";
if (!url || !key) { console.error("SUPABASE_URL 과 SUPABASE_SERVICE_KEY 가 필요해요."); process.exit(1); }

const headers = { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) };
const TABLES = [
  "profiles", "villages", "village_members", "houses", "research_status", "village_invites",
  "daily_logs", "research_notes", "diary_entries", "revisions",
  "whiteboard_items", "whiteboard_comments", "postits", "achievements", "deadlines", "todos",
  "conversations", "messages", "books", "book_entries", "meetings", "news_posts", "shouts", "notifications",
];

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(`${url}/rest/v1/${table}?select=*`, { headers: { ...headers, Range: `${from}-${from + 999}`, "Range-Unit": "items" } });
      if (res.ok || res.status === 416) break;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
    if (res.status === 416) break;
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

fs.mkdirSync(out, { recursive: true });
const data = {};
const counts = {};
for (const t of TABLES) {
  data[t] = await fetchAll(t);
  counts[t] = data[t].length;
}
fs.writeFileSync(path.join(out, "backup.json"), JSON.stringify({ exported_at: new Date().toISOString(), counts, data }, null, 2));

// 사람별 텍스트: 일지·연구노트·다이어리를 읽기 쉬운 마크다운으로
const names = Object.fromEntries(data.profiles.map((p) => [p.id, p.display_name || p.id.slice(0, 8)]));
const safe = (s) => String(s).replace(/[\\/:*?"<>|]+/g, " ").trim() || "이름없음";
fs.mkdirSync(path.join(out, "per-user"), { recursive: true });
for (const p of data.profiles) {
  const logs = data.daily_logs.filter((x) => x.user_id === p.id && x.body).sort((a, b) => a.log_date.localeCompare(b.log_date));
  const notes = data.research_notes.filter((x) => x.user_id === p.id);
  const diary = data.diary_entries.filter((x) => x.author_id === p.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const parts = [`# ${names[p.id]} 의 연구 기록 (${new Date().toISOString().slice(0, 10)} 백업)`];
  if (logs.length) parts.push("## 오늘의 일지\n\n" + logs.map((x) => `### ${x.log_date}\n\n${x.body.trim()}\n`).join("\n"));
  if (notes.length) parts.push("## 연구노트\n\n" + notes.map((x) => `### [${x.category}] ${x.title || "(제목 없음)"}\n\n${x.body.trim()}\n`).join("\n"));
  if (diary.length) parts.push("## 다이어리\n\n" + diary.map((x) => `### ${x.created_at.slice(0, 10)} ${x.title || ""}\n\n${x.body.trim()}\n`).join("\n"));
  if (parts.length > 1) fs.writeFileSync(path.join(out, "per-user", `${safe(names[p.id])}-${p.id.slice(0, 8)}.md`), parts.join("\n\n"));
}
console.log("백업 완료:", JSON.stringify(counts));
