// 로컬 Supabase 에 대해 정원·권한·타이머 규칙을 검증한다.  실행: npm run test:backend
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.");

const run = Date.now();
async function user(n) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signUp({
    email: `t${run}-${n}@example.com`, password: "password123",
    options: { data: { display_name: `연구자${n}` } },
  });
  if (error) throw error;
  return { c, id: data.user.id };
}
const ok = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };
let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("  ✓", name); };

const anon = createClient(url, key, { auth: { persistSession: false } });
const u = [];
for (let i = 0; i < 8; i++) u.push(await user(i));
const [a, b] = u;
let village, code;

await t("비로그인 사용자는 아무 것도 읽지 못한다", async () => {
  for (const tbl of ["profiles", "villages", "research_status", "diary_entries"]) {
    const r = await anon.from(tbl).select("*");
    assert.ok(r.error || r.data.length === 0, tbl);
  }
  assert.ok((await anon.rpc("create_village", { p_name: "x" })).error);
});

await t("마을 생성: 집 6채, 만든 사람은 관리자·0번 집", async () => {
  village = ok(await a.c.rpc("create_village", { p_name: "테스트 마을" }));
  const houses = ok(await a.c.from("houses").select("*").eq("village_id", village));
  assert.equal(houses.length, 6);
  assert.equal(houses.find((h) => h.slot === 0).owner_id, a.id);
  const m = ok(await a.c.from("village_members").select("*"));
  assert.equal(m[0].role, "admin");
});

await t("주민이 아니면 마을·주민·상태를 볼 수 없다", async () => {
  assert.equal(ok(await b.c.from("villages").select("*")).length, 0);
  assert.equal(ok(await b.c.from("research_status").select("*")).length, 0);
  assert.equal(ok(await b.c.from("profiles").select("*")).length, 1); // 자기 자신만
});

await t("초대: 관리자만 발급, 잘못된 코드는 거절", async () => {
  assert.ok((await b.c.rpc("create_invite", { p_village: village })).error);
  code = ok(await a.c.rpc("create_invite", { p_village: village }));
  assert.match((await b.c.rpc("join_village", { p_code: "nope" })).error.message, /invalid_invite/);
  const pv = ok(await b.c.rpc("preview_invite", { p_code: code }));
  assert.equal(pv[0].village_name, "테스트 마을");
});

await t("정원 6명: 동시에 가입해도 7번째는 거절", async () => {
  const res = await Promise.all(u.slice(1, 8).map((x) => x.c.rpc("join_village", { p_code: code })));
  const okCount = res.filter((r) => !r.error).length;
  assert.equal(okCount, 5);
  for (const r of res.filter((r) => r.error)) assert.match(r.error.message, /village_full/);
  assert.equal(ok(await a.c.from("village_members").select("*")).length, 6);
});
const members = ok(await a.c.from("village_members").select("user_id")).map((m) => m.user_id);
const inside = u.filter((x) => members.includes(x.id));
const outside = u.filter((x) => !members.includes(x.id));
const [m1, m2, m3] = inside.filter((x) => x.id !== a.id);

await t("재발급하면 이전 초대 링크는 무효", async () => {
  const code2 = ok(await a.c.rpc("create_invite", { p_village: village }));
  assert.notEqual(code, code2);
  assert.match((await outside[0].c.rpc("join_village", { p_code: code })).error.message, /invalid_invite/);
  code = code2;
});

await t("상태: 본인 것만 바꿀 수 있고, 주민에게만 보인다", async () => {
  ok(await m1.c.from("research_status").update({ status: "open", topic: "조선 후기 인쇄문화" }).eq("user_id", m1.id));
  const r = await m2.c.from("research_status").update({ status: "focus" }).eq("user_id", m1.id).select();
  assert.equal(r.data.length, 0);
  const seen = ok(await a.c.from("research_status").select("*").eq("user_id", m1.id));
  assert.equal(seen[0].status, "open");
  assert.equal(ok(await outside[0].c.from("research_status").select("*")).length, 0);
  // 접속 시각은 클라이언트가 임의로 쓸 수 없다
  assert.ok((await m1.c.from("research_status").update({ last_seen_at: "2000-01-01" }).eq("user_id", m1.id)).error);
});

await t("머리 위 한마디: 본인만, 30자 이하, 올린 시각 기록", async () => {
  ok(await m1.c.from("research_status").update({ message: "  점심 먹고 올게요  " }).eq("user_id", m1.id));
  const row = ok(await m2.c.from("research_status").select("message, message_at").eq("user_id", m1.id).single());
  assert.equal(row.message, "점심 먹고 올게요"); assert.ok(row.message_at);
  assert.ok((await m1.c.from("research_status").update({ message: "가".repeat(31) }).eq("user_id", m1.id)).error);
  assert.equal((await m2.c.from("research_status").update({ message: "해킹" }).eq("user_id", m1.id).select()).data.length, 0);
  assert.equal(ok(await outside[0].c.from("research_status").select("message")).length, 0);
  ok(await m1.c.from("research_status").update({ message: "" }).eq("user_id", m1.id));
  const cleared = ok(await m1.c.from("research_status").select("message, message_at").eq("user_id", m1.id).single());
  assert.equal(cleared.message, ""); assert.equal(cleared.message_at, null);
  assert.ok((await m1.c.from("research_status").update({ message_at: "2000-01-01" }).eq("user_id", m1.id)).error); // 시각은 서버만 정한다
});

await t("광장 소식: 주민만 읽고 쓰고, 지우기는 작성자·관리자만", async () => {
  const post = ok(await m1.c.from("news_posts").insert({ village_id: village, category: "conference", title: "2026 한국사학회 가을 학술대회 발표 모집", link_url: "https://example.org/cfp", deadline: "2026-12-01" }).select().single());
  assert.equal(ok(await m2.c.from("news_posts").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("news_posts").select("*")).length, 0);
  assert.ok((await outside[0].c.from("news_posts").insert({ village_id: village, title: "침입" })).error);
  assert.ok((await m2.c.from("news_posts").insert({ village_id: village, title: "x", author_id: m1.id })).error); // 남의 이름 불가
  assert.ok((await m2.c.from("news_posts").insert({ village_id: village, title: "x", category: "spam" })).error);
  assert.ok((await m2.c.from("news_posts").insert({ village_id: village, title: "x", link_url: "javascript:alert(1)" })).error);
  assert.ok((await m2.c.from("news_posts").insert({ village_id: village, title: "   " })).error);
  assert.equal((await m2.c.from("news_posts").delete().eq("id", post.id).select()).data.length, 0);
  assert.equal((await a.c.from("news_posts").delete().eq("id", post.id).select()).data.length, 1); // 관리자는 지울 수 있다
  const mine = ok(await m2.c.from("news_posts").insert({ village_id: village, category: "job", title: "연구원 채용" }).select().single());
  assert.equal((await m2.c.from("news_posts").delete().eq("id", mine.id).select()).data.length, 1);
});

await t("마감 일정과 할 일은 본인만", async () => {
  const d = ok(await m1.c.from("deadlines").insert({ title: "학회 발표 원고", due_date: "2026-12-01" }).select().single());
  ok(await m1.c.from("deadlines").insert({ title: "논문 투고", due_date: "2026-12-20" }));
  const td = ok(await m1.c.from("todos").insert({ body: "참고문헌 정리" }).select().single());
  ok(await m1.c.from("todos").insert({ body: "교수님께 메일", due_date: "2026-11-30" }));
  ok(await m1.c.from("todos").update({ done: true }).eq("id", td.id));
  assert.equal(ok(await m1.c.from("deadlines").select("*")).length, 2);
  assert.equal(ok(await m1.c.from("todos").select("*")).length, 2);
  for (const x of [m2, a, outside[0]]) { // 같은 마을 주민·관리자·마을 밖 사람 모두 볼 수 없다
    assert.equal(ok(await x.c.from("deadlines").select("*")).length, 0);
    assert.equal(ok(await x.c.from("todos").select("*")).length, 0);
  }
  assert.equal((await m2.c.from("deadlines").update({ done: true }).eq("id", d.id).select()).data.length, 0);
  assert.equal((await m2.c.from("todos").delete().eq("id", td.id).select()).data.length, 0);
  assert.ok((await m2.c.from("deadlines").insert({ user_id: m1.id, title: "대신", due_date: "2026-12-01" })).error);
  assert.ok((await m1.c.from("deadlines").insert({ title: "   ", due_date: "2026-12-01" })).error);
  assert.ok((await m1.c.from("deadlines").insert({ title: "날짜 없음" })).error);
  assert.ok((await m1.c.from("todos").insert({ body: "가".repeat(121) })).error);
  assert.equal((await m1.c.from("todos").delete().eq("id", td.id).select()).data.length, 1);
});

await t("연구실 창 배치는 본인 것만 바꾼다", async () => {
  const layout = { order: ["todos", "deadlines", "journal", "notes", "diary"], collapsed: ["diary"] };
  ok(await m1.c.from("profiles").update({ lab_layout: layout }).eq("id", m1.id));
  assert.deepEqual(ok(await m1.c.from("profiles").select("lab_layout").eq("id", m1.id).single()).lab_layout, layout);
  assert.equal((await m2.c.from("profiles").update({ lab_layout: { order: [] } }).eq("id", m1.id).select()).data.length, 0);
  assert.ok((await m1.c.from("profiles").update({ lab_layout: [1, 2] }).eq("id", m1.id)).error);            // 객체만
  assert.ok((await m1.c.from("profiles").update({ lab_layout: { x: "가".repeat(1200) } }).eq("id", m1.id)).error); // 크기 제한
  ok(await m1.c.from("profiles").update({ lab_layout: {} }).eq("id", m1.id));
});

await t("연구실 안쪽 꾸미기는 본인 것만 바꾸고, 주민은 볼 수 있다", async () => {
  const style = { wall: "#e4f4e1", pattern: "dots", floor: "tile", accent: "#5f8fd6", rug: "square", view: "rain", pet: "dog", extras: ["plant", "globe"] };
  ok(await m1.c.from("profiles").update({ lab_style: style }).eq("id", m1.id));
  assert.deepEqual(ok(await m2.c.from("profiles").select("lab_style").eq("id", m1.id).single()).lab_style, style); // 같은 마을 주민에게 보인다
  assert.equal((await m2.c.from("profiles").update({ lab_style: {} }).eq("id", m1.id).select()).data.length, 0);
  assert.ok((await m1.c.from("profiles").update({ lab_style: "x" }).eq("id", m1.id)).error);
  assert.ok((await m1.c.from("profiles").update({ lab_style: { x: "가".repeat(700) } }).eq("id", m1.id)).error);
});

await t("집 꾸미기: 자기 집만, 소유자는 못 바꾼다", async () => {
  ok(await m1.c.from("houses").update({ style: { roof: "#f00" } }).eq("owner_id", m1.id));
  assert.equal((await m1.c.from("houses").update({ style: { roof: "#0f0" } }).eq("owner_id", a.id).select()).data.length, 0);
  assert.ok((await m1.c.from("houses").update({ owner_id: m1.id }).eq("owner_id", a.id)).error);
});

await t("다이어리는 본인만 볼 수 있다 (공개 범위 없음)", async () => {
  const mk = async (extra = {}) => ok(await m1.c.from("diary_entries").insert({ body: "내 기록", ...extra }).select().single());
  const mine = await mk();
  assert.equal(mine.visibility, "private");
  // 마을 공개로 쓰려 해도 막힌다
  assert.ok((await m1.c.from("diary_entries").insert({ body: "공개 시도", visibility: "village" })).error);
  assert.ok((await m1.c.from("diary_entries").update({ visibility: "village" }).eq("id", mine.id)).error);
  const ids = async (x) => ok(await x.c.from("diary_entries").select("id")).map((e) => e.id);
  assert.deepEqual(await ids(m1), [mine.id]);
  assert.deepEqual(await ids(m2), []);       // 같은 마을 주민도 못 본다
  assert.deepEqual(await ids(a), []);        // 관리자도 못 본다
  assert.deepEqual(await ids(outside[0]), []);
  // 남의 글 수정·삭제·대리 작성 불가
  assert.equal((await m2.c.from("diary_entries").update({ body: "hack" }).eq("id", mine.id).select()).data.length, 0);
  assert.equal((await m2.c.from("diary_entries").delete().eq("id", mine.id).select()).data.length, 0);
  assert.ok((await m2.c.from("diary_entries").insert({ body: "x", author_id: m1.id })).error);
  ok(await outside[0].c.from("diary_entries").insert({ body: "마을이 없어도 내 기록은 쓸 수 있다" })); // 마을과 무관한 개인 기록
  assert.deepEqual(await ids(m1), [mine.id]);
});

await t("광장 외침: 광장에 있는 주민만 외치고, 마을 주민은 모두 읽는다", async () => {
  const st = async (x, status) => ok(await x.c.from("research_status").update({ status }).eq("user_id", x.id));
  await st(m1, "open");
  assert.ok((await m1.c.from("shouts").insert({ village_id: village, body: "광장 밖에서 외침" })).error); // 광장이 아니면 불가
  await st(m1, "rest");
  const sh = ok(await m1.c.from("shouts").insert({ village_id: village, body: "오늘 저녁 세미나 같이 가요!" }).select().single());
  assert.equal(ok(await m2.c.from("shouts").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("shouts").select("*")).length, 0);
  assert.ok((await outside[0].c.from("shouts").insert({ village_id: village, body: "침입" })).error);
  await st(m2, "rest");
  assert.ok((await m2.c.from("shouts").insert({ village_id: village, body: "x", author_id: m1.id })).error); // 남의 이름 불가
  assert.ok((await m2.c.from("shouts").insert({ village_id: village, body: "   " })).error);
  assert.ok((await m2.c.from("shouts").insert({ village_id: village, body: "가".repeat(101) })).error);
  assert.equal((await m2.c.from("shouts").delete().eq("id", sh.id).select()).data.length, 0);
  assert.equal((await a.c.from("shouts").delete().eq("id", sh.id).select()).data.length, 1); // 관리자는 지울 수 있다
  const mine = ok(await m2.c.from("shouts").insert({ village_id: village, body: "저도 갈게요" }).select().single());
  assert.equal((await m2.c.from("shouts").delete().eq("id", mine.id).select()).data.length, 1);
});

await t("연구실: 화이트보드 댓글·포스트잇·알림", async () => {
  const notifs = async (x) => ok(await x.c.from("notifications").select("*").order("created_at"));
  const item = ok(await m1.c.from("whiteboard_items").insert({ owner_id: m1.id, body: "방각본 간행 연대를 어떻게 추정할까?" }).select().single());
  // 주민은 보고, 마을 밖 사람은 못 본다 / 남의 이름으로 쓰기 불가
  assert.equal(ok(await m2.c.from("whiteboard_items").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("whiteboard_items").select("*")).length, 0);
  assert.ok((await m2.c.from("whiteboard_items").insert({ owner_id: m1.id, body: "대신 씀" })).error);
  assert.equal((await m2.c.from("whiteboard_items").update({ resolved: true }).eq("id", item.id).select()).data.length, 0);
  // 댓글 → 주인에게 알림, 자기 댓글은 알림 없음
  ok(await m2.c.from("whiteboard_comments").insert({ item_id: item.id, body: "판식과 지질을 보세요" }));
  let n1 = await notifs(m1);
  assert.equal(n1.length, 1); assert.equal(n1[0].kind, "comment"); assert.equal(n1[0].actor_id, m2.id); assert.equal(n1[0].room_owner_id, m1.id);
  assert.equal((await notifs(m2)).length, 0);
  ok(await m1.c.from("whiteboard_comments").insert({ item_id: item.id, body: "고맙습니다" }));
  assert.equal((await notifs(m2)).length, 1); // 먼저 댓글 단 사람에게도 알림
  ok(await m3.c.from("whiteboard_comments").insert({ item_id: item.id, body: "저도 궁금해요" }));
  assert.equal((await notifs(m1)).length, 2); assert.equal((await notifs(m2)).length, 2);
  assert.ok((await outside[0].c.from("whiteboard_comments").insert({ item_id: item.id, body: "침입" })).error);
  // 댓글 삭제: 작성자나 화이트보드 주인만
  const cs = ok(await m1.c.from("whiteboard_comments").select("*").eq("item_id", item.id));
  const c3 = cs.find((c) => c.author_id === m3.id);
  assert.equal((await m2.c.from("whiteboard_comments").delete().eq("id", c3.id).select()).data.length, 0);
  assert.equal((await m1.c.from("whiteboard_comments").delete().eq("id", c3.id).select()).data.length, 1);
  // 포스트잇
  ok(await m2.c.from("postits").insert({ owner_id: m1.id, body: "응원합니다", color: "#ffb3c8" }));
  assert.equal((await notifs(m1)).filter((n) => n.kind === "postit").length, 1);
  ok(await m1.c.from("postits").insert({ owner_id: m1.id, body: "나에게 메모" })); // 내 벽: 알림 없음
  assert.equal((await notifs(m1)).filter((n) => n.kind === "postit").length, 1);
  assert.ok((await m2.c.from("postits").insert({ owner_id: outside[0].id, body: "x" })).error); // 마을 밖 사람의 방에는 못 붙인다
  assert.ok((await m2.c.from("postits").insert({ owner_id: m1.id, body: "x", author_id: m3.id })).error);
  assert.ok((await m2.c.from("postits").insert({ owner_id: m1.id, body: "x", color: "#000000" })).error);
  assert.ok((await outside[0].c.from("postits").insert({ owner_id: m1.id, body: "침입" })).error);
  assert.equal(ok(await outside[0].c.from("postits").select("*")).length, 0);
  const posts = ok(await m1.c.from("postits").select("*").eq("owner_id", m1.id));
  const fromM2 = posts.find((p) => p.author_id === m2.id);
  assert.equal((await m3.c.from("postits").delete().eq("id", fromM2.id).select()).data.length, 0);
  assert.equal((await m1.c.from("postits").delete().eq("id", fromM2.id).select()).data.length, 1); // 주인은 뗄 수 있다
  // 알림은 본인만 읽고 읽음 처리
  assert.equal((await m3.c.from("notifications").select("*")).data.every((n) => n.user_id === m3.id), true);
  assert.ok((await m1.c.from("notifications").update({ summary: "조작" }).eq("user_id", m1.id)).error);
  const mine = await notifs(m1);
  ok(await m1.c.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", mine[0].id));
  assert.equal((await notifs(m1)).filter((n) => n.read_at).length, 1);
  assert.ok((await m1.c.from("notifications").insert({ user_id: m1.id, village_id: village, actor_id: m2.id, kind: "postit", room_owner_id: m1.id })).error); // 알림은 서버만 만든다
  // 책장(연구 성과)
  const riss = "https://www.riss.kr/link?id=A100000000";
  ok(await m1.c.from("achievements").insert({ owner_id: m1.id, title: "조선 후기 방각본 연구", kind: "article", year: 2025, link_url: riss }));
  assert.equal(ok(await m2.c.from("achievements").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("achievements").select("*")).length, 0);
  assert.ok((await m1.c.from("achievements").insert({ owner_id: m1.id, title: "x", link_url: "javascript:alert(1)" })).error);
  assert.ok((await m2.c.from("achievements").insert({ owner_id: m1.id, title: "대신" })).error);
  assert.equal((await m2.c.from("achievements").delete().eq("owner_id", m1.id).select()).data.length, 0);
});

await t("타이머 기능은 서버에서도 사라졌다", async () => {
  for (const fn of ["timer_start", "timer_pause", "timer_resume", "timer_stop", "village_shared_study"]) {
    assert.ok((await m1.c.rpc(fn, {})).error, fn);
  }
});

await t("오늘의 일지와 연구노트는 본인만 (카테고리별)", async () => {
  ok(await m1.c.from("daily_logs").upsert({ user_id: m1.id, log_date: "2026-11-12", body: "오늘은 방각본 목록 정리" }));
  ok(await m1.c.from("daily_logs").upsert({ user_id: m1.id, log_date: "2026-11-12", body: "수정한 일지" }));
  assert.equal(ok(await m1.c.from("daily_logs").select("*")).length, 1);
  assert.equal(ok(await m2.c.from("daily_logs").select("*")).length, 0);
  assert.equal((await m2.c.from("daily_logs").update({ body: "해킹" }).eq("user_id", m1.id).select()).data.length, 0);
  assert.ok((await m2.c.from("daily_logs").insert({ user_id: m1.id, log_date: "2026-11-13", body: "남의 일지" })).error);
  const n1 = ok(await m1.c.from("research_notes").insert({ category: "방각본", title: "목록", body: "완판본 정리" }).select().single());
  ok(await m1.c.from("research_notes").insert({ category: "논문 구상", title: "2장", body: "" }));
  assert.equal(ok(await m1.c.from("research_notes").select("*").eq("category", "방각본")).length, 1);
  assert.equal(ok(await m2.c.from("research_notes").select("*")).length, 0);
  assert.equal((await m2.c.from("research_notes").delete().eq("id", n1.id).select()).data.length, 0);
  assert.ok((await m1.c.from("research_notes").insert({ category: "   ", body: "x" })).error);
  assert.ok((await outside[0].c.from("research_notes").insert({ user_id: m1.id, category: "x" })).error);
});

await t("대화: 열린 연구 중인 주민에게만 신청·수락 후 실시간 메시지", async () => {
  const st = async (x, status) => ok(await x.c.from("research_status").update({ status }).eq("user_id", x.id));
  await st(m2, "focus");
  assert.match((await m1.c.rpc("request_chat", { p_village: village, p_target: m2.id })).error.message, /not_available/);
  await st(m2, "open");
  assert.ok((await m1.c.rpc("request_chat", { p_village: village, p_target: m1.id })).error);
  assert.ok((await m1.c.rpc("request_chat", { p_village: village, p_target: outside[0].id })).error);
  const conv = ok(await m1.c.rpc("request_chat", { p_village: village, p_target: m2.id }));
  assert.equal(conv.status, "pending");
  assert.equal(ok(await m1.c.rpc("request_chat", { p_village: village, p_target: m2.id })).id, conv.id); // 중복 신청은 같은 대화
  assert.equal((await m2.c.from("notifications").select("*")).data.filter((n) => n.kind === "chat_request").length, 1);
  // 수락 전에는 메시지를 보낼 수 없다
  assert.ok((await m1.c.from("messages").insert({ conversation_id: conv.id, body: "안녕하세요" })).error);
  assert.ok((await m1.c.rpc("respond_chat", { p_conv: conv.id, p_accept: true })).error); // 신청자는 수락 불가
  assert.equal(ok(await m3.c.from("conversations").select("*")).length, 0); // 제3자는 못 본다
  ok(await m2.c.rpc("respond_chat", { p_conv: conv.id, p_accept: true }));
  ok(await m1.c.from("messages").insert({ conversation_id: conv.id, body: "안녕하세요" }));
  ok(await m2.c.from("messages").insert({ conversation_id: conv.id, body: "반가워요" }));
  assert.equal(ok(await m1.c.from("messages").select("*").eq("conversation_id", conv.id)).length, 2);
  assert.equal(ok(await m3.c.from("messages").select("*")).length, 0);
  assert.equal(ok(await outside[0].c.from("messages").select("*")).length, 0);
  assert.ok((await m3.c.from("messages").insert({ conversation_id: conv.id, body: "끼어들기" })).error);
  assert.ok((await m1.c.from("messages").insert({ conversation_id: conv.id, body: "x", sender_id: m2.id })).error); // 남의 이름 불가
  assert.ok((await m1.c.from("messages").insert({ conversation_id: conv.id, body: "   " })).error);
  const c1 = ok(await m1.c.from("conversations").select("*").eq("id", conv.id).single());
  assert.equal(c1.last_sender, m2.id);
  assert.ok((await m1.c.from("conversations").update({ status: "ended" }).eq("id", conv.id)).error); // 직접 수정 불가
  ok(await m1.c.rpc("mark_chat_read", { p_conv: conv.id }));
  ok(await m1.c.rpc("end_chat", { p_conv: conv.id }));
  assert.ok((await m2.c.from("messages").insert({ conversation_id: conv.id, body: "종료 후" })).error);
  // 거절
  const conv2 = ok(await m3.c.rpc("request_chat", { p_village: village, p_target: m2.id }));
  ok(await m2.c.rpc("respond_chat", { p_conv: conv2.id, p_accept: false }));
  assert.equal(ok(await m3.c.from("conversations").select("*").eq("id", conv2.id).single()).status, "declined");
});

await t("도서관: 공동 집필 책에 이어 쓰기, 회의 등록", async () => {
  const book = ok(await m1.c.from("books").insert({ village_id: village, title: "조선 서적 유통사", topic: "방각본과 세책점" }).select().single());
  assert.equal(ok(await m2.c.from("books").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("books").select("*")).length, 0);
  assert.ok((await outside[0].c.from("books").insert({ village_id: village, title: "침입" })).error);
  ok(await m1.c.from("book_entries").insert({ book_id: book.id, village_id: village, heading: "1장", body: "서론을 씁니다." }));
  ok(await m2.c.from("book_entries").insert({ book_id: book.id, village_id: village, body: "이어서 방각본의 등장 배경을 씁니다." }));
  const es = ok(await m3.c.from("book_entries").select("*").eq("book_id", book.id).order("created_at"));
  assert.equal(es.length, 2); assert.equal(es[1].author_id, m2.id);
  assert.ok((await m2.c.from("book_entries").insert({ book_id: book.id, village_id: village, body: "x", author_id: m3.id })).error);
  assert.ok((await outside[0].c.from("book_entries").insert({ book_id: book.id, village_id: village, body: "x" })).error);
  assert.equal((await m3.c.from("book_entries").update({ body: "고침" }).eq("id", es[0].id).select()).data.length, 0);
  assert.equal((await m3.c.from("book_entries").delete().eq("id", es[1].id).select()).data.length, 0);
  assert.equal((await m2.c.from("books").update({ status: "finished" }).eq("id", book.id).select()).data.length, 0); // 만든 사람만
  ok(await m1.c.from("books").update({ status: "finished" }).eq("id", book.id));
  assert.ok((await m2.c.from("book_entries").insert({ book_id: book.id, village_id: village, body: "완결 후" })).error);
  assert.equal((await m1.c.from("book_entries").delete().eq("id", es[1].id).select()).data.length, 1); // 책 만든 사람은 정리 가능
  // Zoom 회의
  const when = new Date(Date.now() + 3600e3).toISOString();
  assert.ok((await m1.c.from("meetings").insert({ village_id: village, title: "x", starts_at: when, zoom_url: "https://evil.example.com/j/123" })).error);
  assert.ok((await m1.c.from("meetings").insert({ village_id: village, title: "x", starts_at: when, zoom_url: "http://zoom.us/j/123" })).error);
  assert.ok((await m1.c.from("meetings").insert({ village_id: village, title: "x", starts_at: when, zoom_url: "https://zoom.us.evil.com/j/1" })).error);
  const before = (await m2.c.from("notifications").select("*")).data.length;
  const meet = ok(await m1.c.from("meetings").insert({ village_id: village, title: "주간 세미나", starts_at: when, zoom_url: "https://us02web.zoom.us/j/123456789?pwd=abc" }).select().single());
  assert.equal(ok(await m2.c.from("meetings").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("meetings").select("*")).length, 0);
  const after = (await m2.c.from("notifications").select("*")).data;
  assert.equal(after.length, before + 1); assert.ok(after.some((n) => n.kind === "meeting"));
  assert.equal((await m1.c.from("notifications").select("*")).data.filter((n) => n.kind === "meeting").length, 0); // 만든 사람에겐 알림 없음
  assert.equal((await m2.c.from("meetings").delete().eq("id", meet.id).select()).data.length, 0);
  ok(await m1.c.from("meetings").delete().eq("id", meet.id));
  // 집필자가 떠나도 글은 남는다 (작성자만 비워진다)
  ok(await m3.c.from("book_entries").insert({ book_id: ok(await m1.c.from("books").insert({ village_id: village, title: "둘째 책" }).select().single()).id, village_id: village, body: "m3의 글" }));
});

await t("여러 마을: 마을마다 따로인 것과 하나로 공유되는 것", async () => {
  const o = outside[1];
  // 이미 마을이 있어도 새 마을을 만들 수 있다 (집·연구 상태는 마을마다 따로)
  const v2 = ok(await m1.c.rpc("create_village", { p_name: "두 번째 마을" }));
  assert.equal(ok(await m1.c.from("village_members").select("*").eq("user_id", m1.id)).length, 2);
  ok(await m1.c.from("research_status").update({ status: "focus", topic: "둘째 마을 주제" }).eq("village_id", v2).eq("user_id", m1.id));
  const rows = ok(await m1.c.from("research_status").select("*").eq("user_id", m1.id));
  assert.equal(rows.length, 2);
  assert.notEqual(rows.find((r) => r.village_id === v2).topic, rows.find((r) => r.village_id === village).topic);
  assert.equal(ok(await m1.c.from("houses").select("*").eq("village_id", v2).eq("owner_id", m1.id)).length, 1);
  // 새 마을에 초대한 사람은 m1 의 연구실(첫 마을에서 쓴 화이트보드·책장)을 그대로 본다
  const code2 = ok(await m1.c.rpc("create_invite", { p_village: v2 }));
  assert.equal(ok(await o.c.from("whiteboard_items").select("*")).length, 0); // 같은 마을이 되기 전에는 안 보인다
  ok(await o.c.rpc("join_village", { p_code: code2 }));
  assert.ok(ok(await o.c.from("whiteboard_items").select("*").eq("owner_id", m1.id)).length >= 1);
  assert.ok(ok(await o.c.from("achievements").select("*").eq("owner_id", m1.id)).length >= 1);
  assert.equal(ok(await o.c.from("whiteboard_items").select("*").eq("owner_id", m2.id)).length, 0); // 함께 사는 마을이 없는 주민의 연구실은 안 보인다
  assert.equal(ok(await o.c.from("research_status").select("*").eq("village_id", village)).length, 0);  // 마을 상태도 마을별
  // o 가 붙인 포스트잇은 m1 의 방에 있으므로 첫 마을 주민도 볼 수 있고, 알림은 둘이 함께 사는 마을(v2)에서 열린다
  ok(await o.c.from("postits").insert({ owner_id: m1.id, body: "둘째 마을에서 왔어요" }));
  assert.equal(ok(await m2.c.from("postits").select("*").eq("body", "둘째 마을에서 왔어요")).length, 1);
  const n = ok(await m1.c.from("notifications").select("*").eq("actor_id", o.id));
  assert.equal(n.length, 1); assert.equal(n[0].village_id, v2);
  assert.ok((await o.c.from("postits").insert({ owner_id: m2.id, body: "남의 마을" })).error); // 함께 사는 마을이 없으면 붙일 수 없다
  // 다이어리·연구실은 마을을 떠나도 남는다
  const diary = ok(await m1.c.from("diary_entries").insert({ body: "마을과 상관없는 기록" }).select().single());
  ok(await m1.c.rpc("leave_village", { p_village: v2 }));
  assert.equal(ok(await m1.c.from("diary_entries").select("id").eq("id", diary.id)).length, 1);
  assert.ok(ok(await m1.c.from("whiteboard_items").select("*").eq("owner_id", m1.id)).length >= 1);
  assert.equal(ok(await o.c.from("whiteboard_items").select("*").eq("owner_id", m1.id)).length, 0); // 이제 함께 사는 마을이 없다
  assert.equal(ok(await m1.c.from("postits").select("*").eq("body", "둘째 마을에서 왔어요")).length, 1); // 내 연구실의 포스트잇은 그대로
  // 한 계정은 마을을 최대 5개까지
  for (let i = 0; i < 3; i++) ok(await m2.c.rpc("create_village", { p_name: `마을 ${i}` }));
  assert.equal(ok(await m2.c.from("village_members").select("*").eq("user_id", m2.id)).length, 4);
  ok(await m2.c.rpc("create_village", { p_name: "다섯째" }));
  assert.match((await m2.c.rpc("create_village", { p_name: "여섯째" })).error.message, /too_many_villages/);
  assert.match((await m2.c.rpc("join_village", { p_code: code2 })).error.message, /too_many_villages|invalid_invite/);
});

await t("기록 보호: 수정 번호·이력·삭제 복구, 일지 마을 공개", async () => {
  const day = "2026-11-20";
  // 수정 번호(rev): 쓸 때마다 늘고, 낡은 번호로는 덮어쓸 수 없다
  const j = ok(await m1.c.from("daily_logs").insert({ user_id: m1.id, log_date: day, body: "가".repeat(100) }).select("rev, shared_villages").single());
  assert.equal(j.rev, 1); assert.deepEqual(j.shared_villages, []);
  const j2 = ok(await m1.c.from("daily_logs").update({ body: "가".repeat(100) + "나" }).eq("user_id", m1.id).eq("log_date", day).eq("rev", 1).select("rev"));
  assert.equal(j2[0].rev, 2);
  const stale = ok(await m1.c.from("daily_logs").update({ body: "낡은 탭의 글" }).eq("user_id", m1.id).eq("log_date", day).eq("rev", 1).select("rev"));
  assert.equal(stale.length, 0);                                                                   // 다른 곳에서 먼저 고쳤으면 조용히 덮어쓰지 않는다
  assert.ok((await m1.c.from("daily_logs").update({ rev: 99 }).eq("user_id", m1.id)).error);       // rev 는 서버만 올린다
  assert.ok((await m1.c.from("revisions").insert({ user_id: m1.id, kind: "journal", item_key: day, body: "x" })).error); // 이력은 서버만 쓴다
  // 이력: 처음엔 남고(마지막 이력 없음), 5분 안에 조금 고치면 안 남고, 글이 크게 줄면 남는다
  let revs = ok(await m1.c.from("revisions").select("*").eq("kind", "journal").eq("item_key", day).order("created_at"));
  assert.equal(revs.length, 1); assert.equal(revs[0].body, "가".repeat(100));
  ok(await m1.c.from("daily_logs").update({ body: "짧게" }).eq("user_id", m1.id).eq("log_date", day));  // 크게 줄어듦
  revs = ok(await m1.c.from("revisions").select("*").eq("kind", "journal").eq("item_key", day).order("created_at"));
  assert.equal(revs.length, 2); assert.equal(revs[1].body, "가".repeat(100) + "나");
  assert.equal(ok(await m2.c.from("revisions").select("*").eq("user_id", m1.id)).length, 0);       // 남의 이력은 못 본다
  assert.equal(ok(await outside[0].c.from("revisions").select("*")).length, 0);
  assert.equal((await m1.c.from("revisions").delete().eq("user_id", m1.id).select()).data?.length ?? 0, 0); // 이력은 지울 수 없다
  // 노트: 지워도 이력에 남아 복구할 수 있다
  const n = ok(await m1.c.from("research_notes").insert({ category: "방각본", title: "소중한 노트", body: "되돌릴 수 있어야 하는 글" }).select("id, rev").single());
  ok(await m1.c.from("research_notes").delete().eq("id", n.id));
  const del = ok(await m1.c.from("revisions").select("*").eq("kind", "note").eq("item_key", n.id));
  assert.equal(del.length, 1); assert.equal(del[0].reason, "delete"); assert.equal(del[0].body, "되돌릴 수 있어야 하는 글"); assert.equal(del[0].category, "방각본");
  // 다이어리도 마찬가지
  const dd = ok(await m1.c.from("diary_entries").insert({ body: "지운 다이어리", title: "t" }).select("id").single());
  ok(await m1.c.from("diary_entries").delete().eq("id", dd.id));
  assert.equal(ok(await m1.c.from("revisions").select("*").eq("kind", "diary").eq("item_key", dd.id)).length, 1);
  // 일지 공개: 기본은 나만, 내 마을을 골라 공개하면 그 마을 주민만 읽는다
  assert.equal(ok(await m2.c.from("daily_logs").select("*").eq("user_id", m1.id)).length, 0);
  ok(await m1.c.from("daily_logs").update({ shared_villages: [village] }).eq("user_id", m1.id).eq("log_date", day));
  const seen = ok(await m2.c.from("daily_logs").select("log_date, body").eq("user_id", m1.id));
  assert.equal(seen.length, 1); assert.equal(seen[0].body, "짧게");
  assert.equal(ok(await outside[0].c.from("daily_logs").select("*").eq("user_id", m1.id)).length, 0);   // 마을 밖 사람은 못 읽는다
  assert.equal((await m2.c.from("daily_logs").update({ body: "남이 고침" }).eq("user_id", m1.id).select()).data.length, 0);  // 읽기만 된다
  ok(await m1.c.from("daily_logs").insert({ user_id: m1.id, log_date: "2026-11-21", body: "공개 안 한 일지" }));
  assert.equal(ok(await m2.c.from("daily_logs").select("*").eq("user_id", m1.id)).length, 1);           // 비공개 일지는 여전히 안 보인다
  assert.ok((await m1.c.from("daily_logs").update({ shared_villages: [outside[0].id] }).eq("user_id", m1.id).eq("log_date", day)).error); // 내가 살지 않는 마을은 못 고른다
  ok(await m1.c.from("daily_logs").update({ shared_villages: [] }).eq("user_id", m1.id).eq("log_date", day));
  assert.equal(ok(await m2.c.from("daily_logs").select("*").eq("user_id", m1.id)).length, 0);           // 공개를 끄면 바로 사라진다
  // 충돌을 풀 때 쓰는 이력 저장 함수: 내 글만 남길 수 있고, 남의 글은 건드릴 수 없다
  ok(await m1.c.rpc("snapshot_item", { p_kind: "journal", p_key: day }));
  ok(await m1.c.rpc("snapshot_text", { p_kind: "journal", p_key: day, p_title: "", p_category: "", p_body: "내 쪽 글 보관" }));
  const kept = ok(await m1.c.from("revisions").select("body").eq("kind", "journal").eq("item_key", day));
  assert.ok(kept.some((r) => r.body === "내 쪽 글 보관"));
  ok(await m2.c.rpc("snapshot_item", { p_kind: "journal", p_key: day }));                                  // 남의 일지는 이력이 생기지 않는다
  assert.equal(ok(await m2.c.from("revisions").select("*")).filter((r) => r.item_key === day).length, 0);
  assert.ok((await m1.c.rpc("snapshot_text", { p_kind: "x", p_key: "k", p_title: "", p_category: "", p_body: "" })).error);
});

await t("상호작용: 장난·선물·책 추천·일지 반응과 댓글·마감 응원·독촉", async () => {
  const notifOf = async (x, kind) => ok(await x.c.from("notifications").select("*").eq("kind", kind).order("created_at"));
  // 논문 던지기
  ok(await m1.c.rpc("send_gesture", { p_village: village, p_target: m2.id, p_kind: "thesis" }));
  const g = await notifOf(m2, "gesture");
  assert.equal(g.length, 1); assert.equal(g[0].actor_id, m1.id); assert.equal(g[0].summary, "thesis");
  assert.ok((await m1.c.rpc("send_gesture", { p_village: village, p_target: m2.id, p_kind: "bomb" })).error);      // 정해진 종류만
  assert.ok((await m1.c.rpc("send_gesture", { p_village: village, p_target: m1.id, p_kind: "thesis" })).error);    // 자기 자신 불가
  assert.ok((await m1.c.rpc("send_gesture", { p_village: village, p_target: outside[0].id, p_kind: "thesis" })).error); // 마을 밖 불가
  assert.ok((await outside[0].c.rpc("send_gesture", { p_village: village, p_target: m1.id, p_kind: "thesis" })).error);
  // 선물: 책상에 올라가는 커피
  ok(await m1.c.rpc("send_gift", { p_village: village, p_target: m2.id, p_kind: "coffee", p_note: "힘내요!" }));
  assert.equal(ok(await m3.c.from("gifts").select("*").eq("to_user", m2.id)).length, 1);                           // 이웃은 책상 위 선물을 본다
  assert.equal(ok(await outside[0].c.from("gifts").select("*")).length, 0);
  assert.ok((await m1.c.rpc("send_gift", { p_village: village, p_target: m2.id, p_kind: "pizza", p_note: "" })).error);
  assert.ok((await m1.c.from("gifts").insert({ from_user: m1.id, to_user: m2.id, kind: "coffee" })).error);         // 직접 쓰기 불가
  assert.equal((await notifOf(m2, "gift"))[0].summary, "coffee:힘내요!");
  // 책 추천
  ok(await m1.c.rpc("send_book_tip", { p_village: village, p_target: m2.id, p_title: "조선의 책쾌", p_note: "읽어 보세요" }));
  assert.equal(ok(await m3.c.from("book_tips").select("*").eq("to_user", m2.id)).length, 1);
  assert.equal(ok(await outside[0].c.from("book_tips").select("*")).length, 0);
  assert.ok((await m1.c.rpc("send_book_tip", { p_village: village, p_target: m1.id, p_title: "x", p_note: "" })).error);
  const tip = ok(await m2.c.from("book_tips").select("id").eq("to_user", m2.id))[0];
  assert.equal((await m3.c.from("book_tips").delete().eq("id", tip.id).select()).data.length, 0);                    // 남이 지울 수 없다
  assert.equal((await m2.c.from("book_tips").delete().eq("id", tip.id).select()).data.length, 1);                    // 받은 사람은 뗄 수 있다
  // 일지 반응·댓글: 공개한 일지에만
  const d1 = "2026-11-25", d2 = "2026-11-26";
  ok(await m1.c.from("daily_logs").insert({ user_id: m1.id, log_date: d1, body: "공개 일지", shared_villages: [village] }));
  ok(await m1.c.from("daily_logs").insert({ user_id: m1.id, log_date: d2, body: "비공개 일지" }));
  ok(await m2.c.from("journal_reactions").insert({ owner_id: m1.id, log_date: d1, emoji: "clap" }));
  assert.ok((await m2.c.from("journal_reactions").insert({ owner_id: m1.id, log_date: d1, emoji: "clap" })).error);  // 같은 반응은 한 번
  assert.ok((await m2.c.from("journal_reactions").insert({ owner_id: m1.id, log_date: d1, emoji: "poop" })).error);
  assert.ok((await m2.c.from("journal_reactions").insert({ owner_id: m1.id, log_date: d2, emoji: "clap" })).error);  // 비공개 일지엔 불가
  assert.ok((await outside[0].c.from("journal_reactions").insert({ owner_id: m1.id, log_date: d1, emoji: "clap" })).error);
  assert.equal((await notifOf(m1, "journal_reaction")).length, 1);
  ok(await m2.c.from("journal_comments").insert({ owner_id: m1.id, log_date: d1, body: "저도 같은 고민이에요" }));
  assert.equal((await notifOf(m1, "journal_comment")).length, 1);
  ok(await m3.c.from("journal_comments").insert({ owner_id: m1.id, log_date: d1, body: "저도요" }));
  assert.equal((await notifOf(m2, "journal_comment")).length, 1);                                                   // 먼저 댓글 단 사람에게도 알림
  assert.ok((await m2.c.from("journal_comments").insert({ owner_id: m1.id, log_date: d2, body: "몰래" })).error);
  assert.ok((await m2.c.from("journal_comments").insert({ owner_id: m1.id, log_date: d1, body: "x", author_id: m3.id })).error);
  assert.equal(ok(await outside[0].c.from("journal_comments").select("*")).length, 0);
  const cs = ok(await m1.c.from("journal_comments").select("*").eq("log_date", d1));
  assert.equal((await m2.c.from("journal_comments").delete().eq("id", cs.find((c) => c.author_id === m3.id).id).select()).data.length, 0);
  assert.equal((await m1.c.from("journal_comments").delete().eq("id", cs.find((c) => c.author_id === m3.id).id).select()).data.length, 1); // 일지 주인은 지울 수 있다
  ok(await m1.c.from("daily_logs").update({ shared_villages: [] }).eq("user_id", m1.id).eq("log_date", d1));
  assert.equal(ok(await m2.c.from("journal_comments").select("*").eq("log_date", d1)).length, 0);                   // 공개를 끄면 댓글도 가려진다
  // 마감 공개와 응원
  const dl = ok(await m1.c.from("deadlines").insert({ title: "학회 발표 원고", due_date: "2099-12-01", shared: true }).select().single());
  ok(await m1.c.from("deadlines").insert({ title: "비공개 마감", due_date: "2099-12-02" }));
  const seenDl = ok(await m2.c.from("deadlines").select("title").eq("user_id", m1.id));
  assert.deepEqual(seenDl.map((x) => x.title), ["학회 발표 원고"]);                                                   // 공개한 마감만 이웃에게 보인다
  assert.equal(ok(await outside[0].c.from("deadlines").select("*").eq("user_id", m1.id)).length, 0);
  ok(await m2.c.rpc("cheer_deadline", { p_deadline: dl.id }));
  ok(await m2.c.rpc("cheer_deadline", { p_deadline: dl.id }));                                                      // 두 번 눌러도 한 번만
  assert.equal(ok(await m3.c.from("cheers").select("*").eq("deadline_id", dl.id)).length, 1);
  assert.equal((await notifOf(m1, "cheer")).length, 1);
  assert.ok((await m1.c.rpc("cheer_deadline", { p_deadline: dl.id })).error);                                        // 자기 마감은 응원 불가
  assert.ok((await outside[0].c.rpc("cheer_deadline", { p_deadline: dl.id })).error);
  const priv = ok(await m1.c.from("deadlines").select("id").eq("title", "비공개 마감").single());
  assert.ok((await m2.c.rpc("cheer_deadline", { p_deadline: priv.id })).error);
  // 독촉: 3일 넘게 안 들어온 이웃에게만, 같은 사람에게 12시간에 한 번
  assert.match((await m2.c.rpc("send_nudge", { p_village: village, p_target: m1.id })).error.message, /not_away/);
  const svc = process.env.SUPABASE_SERVICE_KEY;
  if (svc) {
    const admin = createClient(url, svc, { auth: { persistSession: false } });
    await admin.from("research_status").update({ last_seen_at: new Date(Date.now() - 4 * 86400e3).toISOString() }).eq("user_id", m1.id).eq("village_id", village);
    ok(await m2.c.rpc("send_nudge", { p_village: village, p_target: m1.id }));
    const nd = await notifOf(m1, "nudge");
    assert.equal(nd.length, 1); assert.ok(nd[0].summary.startsWith("학회 발표 원고|2099-12-01"));
    assert.match((await m2.c.rpc("send_nudge", { p_village: village, p_target: m1.id })).error.message, /too_often/);
    await admin.from("research_status").update({ last_seen_at: new Date().toISOString() }).eq("user_id", m1.id).eq("village_id", village);
  }
});

await t("관리자가 주민을 내보내면 집이 비고 기록이 사라진다", async () => {
  assert.ok((await m2.c.rpc("remove_member", { p_village: village, p_user: m3.id })).error);
  ok(await a.c.rpc("remove_member", { p_village: village, p_user: m3.id }));
  const left = ok(await a.c.from("book_entries").select("author_id").eq("body", "m3의 글"));
  assert.equal(left.length, 1); assert.equal(left[0].author_id, null); // 글은 남고 작성자만 비워진다
  assert.equal(ok(await m2.c.from("conversations").select("*")).filter((c) => c.user_a === m3.id || c.user_b === m3.id).length, 0);
  assert.equal(ok(await a.c.from("village_members").select("*")).length, 5);
  assert.equal(ok(await a.c.from("houses").select("*").is("owner_id", null)).length, 1);
  ok(await outside[0].c.rpc("join_village", { p_code: code })); // 빈 자리에 새 주민
});

await t("관리자가 떠나면 다음 주민이 관리자가 된다 / 계정 삭제", async () => {
  ok(await a.c.rpc("delete_account"));
  const ms = ok(await m1.c.from("village_members").select("*"));
  assert.equal(ms.length, 5);
  assert.equal(ms.filter((m) => m.role === "admin").length, 1);
  assert.equal(ok(await m1.c.from("profiles").select("id").eq("id", a.id)).length, 0);
  const again = await a.c.auth.signInWithPassword({ email: `t${run}-0@example.com`, password: "password123" });
  assert.ok(again.error);
});

console.log(`\n${passed}개 검사 통과`);
process.exit(0);
