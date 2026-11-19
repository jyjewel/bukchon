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
  // 제목·주제 고치기: 만든 사람과 마을 장만
  assert.equal((await m2.c.from("books").update({ title: "남이 바꾼 제목" }).eq("id", book.id).select()).data.length, 0);
  assert.equal(ok(await m1.c.from("books").update({ title: "조선 서적 유통사(개정)", topic: "방각본·세책점·필사" }).eq("id", book.id).select()).length, 1);
  assert.equal(ok(await a.c.from("books").update({ title: "조선 서적 유통사 (마을 장이 고침)" }).eq("id", book.id).select()).length, 1);
  assert.equal(ok(await m2.c.from("books").select("title,topic").eq("id", book.id).single()).title, "조선 서적 유통사 (마을 장이 고침)");
  assert.ok((await m1.c.from("books").update({ title: "   " }).eq("id", book.id)).error);                                   // 빈 제목 불가
  assert.ok((await a.c.from("books").update({ created_by: a.id }).eq("id", book.id)).error);                               // 만든 사람은 못 바꾼다
  ok(await m1.c.from("books").update({ title: "조선 서적 유통사" }).eq("id", book.id));
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
  assert.ok((await m1.c.rpc("send_gesture", { p_village: village, p_target: m2.id, p_kind: "footnote" })).error);  // 없앤 종류는 더 못 보낸다
  ok(await m1.c.rpc("send_gesture", { p_village: village, p_target: m2.id, p_kind: "snack" }));
  ok(await m1.c.rpc("send_gesture", { p_village: village, p_target: m2.id, p_kind: "alarm" }));
  assert.ok((await m1.c.rpc("send_gesture", { p_village: village, p_target: m1.id, p_kind: "thesis" })).error);    // 자기 자신 불가
  assert.ok((await m1.c.rpc("send_gesture", { p_village: village, p_target: outside[0].id, p_kind: "thesis" })).error); // 마을 밖 불가
  assert.ok((await outside[0].c.rpc("send_gesture", { p_village: village, p_target: m1.id, p_kind: "thesis" })).error);
  // 선물: 책상에 올라가는 커피
  ok(await m1.c.rpc("send_gift", { p_village: village, p_target: m2.id, p_kind: "coffee", p_note: "힘내요!" }));
  assert.equal(ok(await m3.c.from("gifts").select("*").eq("to_user", m2.id)).length, 0);                           // 이웃은 보낸 사람·한마디를 못 본다
  const desk = ok(await m3.c.rpc("desk_gifts", { p_owner: m2.id }));                                               // 책상 위 선물은 종류만 보인다
  assert.equal(desk.length, 1); assert.deepEqual(Object.keys(desk[0]).sort(), ["created_at", "kind"]); assert.equal(desk[0].kind, "coffee");
  assert.equal(ok(await outside[0].c.rpc("desk_gifts", { p_owner: m2.id })).length, 0);
  assert.equal(ok(await m2.c.from("gifts").select("*").eq("to_user", m2.id)).length, 1);                           // 받은 사람은 전부 본다
  assert.equal(ok(await m2.c.from("gifts").select("note, from_user").eq("to_user", m2.id))[0].note, "힘내요!");
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

await t("마을 건물(도서관 모양)은 마을 장만 바꿀 수 있다", async () => {
  assert.equal(ok(await a.c.from("villages").select("library_style").eq("id", village).single()).library_style, "classic");
  // 주민은 못 바꾼다 (정책이 행을 걸러 내서 바뀐 행이 없다)
  assert.equal((await m2.c.from("villages").update({ library_style: "bicheondang" }).eq("id", village).select()).data.length, 0);
  assert.equal(ok(await m2.c.from("villages").select("library_style").eq("id", village).single()).library_style, "classic");
  assert.equal((await outside[0].c.from("villages").update({ library_style: "bicheondang" }).eq("id", village).select()).data?.length ?? 0, 0);
  // 마을 장은 바꿀 수 있고 모든 주민에게 보인다
  assert.equal(ok(await a.c.from("villages").update({ library_style: "bicheondang" }).eq("id", village).select()).length, 1);
  assert.equal(ok(await m2.c.from("villages").select("library_style").eq("id", village).single()).library_style, "bicheondang");
  // 정해진 모양만
  assert.ok((await a.c.from("villages").update({ library_style: "castle" }).eq("id", village)).error);
});

await t("연구실 좋아하는 책장: 주인만 꽂고, 이웃은 구경, 한 단 14권·모두 40권", async () => {
  const fb = (u) => u.c.from("favorite_books");
  const b1 = ok(await fb(m1).insert({ title: "토지", author: "박경리", note: "몇 번을 읽어도", color: "brown", shelf: 2 }).select().single());
  assert.equal(b1.shelf, 2); assert.equal(b1.owner_id, m1.id);
  assert.equal(ok(await fb(m2).select("*")).length, 1);                                                     // 연구실을 볼 수 있는 이웃은 구경한다
  assert.equal(ok(await fb(outside[0]).select("*")).length, 0);                                             // 마을 밖은 못 본다
  assert.ok((await fb(m1).insert({ title: "   ", shelf: 1 })).error);                                       // 빈 제목 불가
  assert.ok((await fb(m1).insert({ title: "5단", shelf: 5 })).error);                                       // 단은 1~4
  assert.ok((await fb(m1).insert({ title: "이상한 색", shelf: 1, color: "rainbow" })).error);
  assert.ok((await fb(m1).insert({ title: "남의 책장", shelf: 1, owner_id: m2.id })).error);                // 주인은 정할 수 없다
  // 남의 책장은 이웃도 마을 장도 못 고친다
  for (const u of [m2, a]) {
    assert.equal((await fb(u).update({ shelf: 3 }).eq("id", b1.id).select()).data.length, 0);
    assert.equal((await fb(u).delete().eq("id", b1.id).select()).data.length, 0);
  }
  assert.equal(ok(await fb(m1).update({ shelf: 3, note: "다시 읽는 중" }).eq("id", b1.id).select()).length, 1);   // 내 책은 단을 옮긴다
  assert.equal(ok(await fb(m1).update({ shelf: 2 }).eq("id", b1.id).select()).length, 1);
  // 한 단 14권
  for (let i = 0; i < 13; i++) ok(await fb(m1).insert({ title: `책 ${i}`, shelf: 2 }));
  assert.match((await fb(m1).insert({ title: "열다섯 번째", shelf: 2 })).error.message, /shelf_full/);
  const loose = ok(await fb(m1).insert({ title: "옮길 책", shelf: 1 }).select().single());
  assert.match((await fb(m1).update({ shelf: 2 }).eq("id", loose.id)).error.message, /shelf_full/);          // 가득 찬 단으로는 못 옮긴다
  // 모두 합쳐 40권
  for (let i = 0; i < 14; i++) ok(await fb(m1).insert({ title: `셋째 단 ${i}`, shelf: 3 }));
  for (let i = 0; i < 11; i++) ok(await fb(m1).insert({ title: `첫째 단 ${i}`, shelf: 1 }));
  assert.match((await fb(m1).insert({ title: "마흔한 번째", shelf: 4 })).error.message, /too_many_books/);
  ok(await fb(m1).delete().eq("id", loose.id));
  ok(await fb(m2).insert({ title: "다른 사람 책장은 따로 센다", shelf: 1 }));
  assert.equal(ok(await fb(m1).select("*").eq("title", "다른 사람 책장은 따로 센다")).length, 1);            // 이웃의 책장도 구경 가능
});

await t("끌어서 순서 바꾸기: 도서관 책(주민 누구나), 연구 성과·좋아하는 책(주인만)", async () => {
  const mkb = async (title) => ok(await m1.c.from("books").insert({ village_id: village, title }).select().single());
  const [x, y, z] = [await mkb("순서 X"), await mkb("순서 Y"), await mkb("순서 Z")];
  ok(await m2.c.rpc("reorder_books", { p_village: village, p_ids: [z.id, x.id, y.id] }));                       // 주민 누구나 책장을 정리한다
  const ordered = ok(await m3.c.from("books").select("id,title,sort_order").in("id", [x.id, y.id, z.id]).order("sort_order"));
  assert.deepEqual(ordered.map((b) => b.title), ["순서 Z", "순서 X", "순서 Y"]);
  assert.ok((await outside[0].c.rpc("reorder_books", { p_village: village, p_ids: [x.id, y.id, z.id] })).error);   // 마을 밖은 못 한다
  assert.equal(ok(await m2.c.from("books").select("sort_order").eq("id", x.id).single()).sort_order, 2);
  assert.equal((await m2.c.from("books").update({ sort_order: 9 }).eq("id", x.id).select()).data?.length ?? 0, 0);   // 순서 칸을 직접 고치는 건 만든 사람·마을 장만
  // 연구 성과: 주인만
  const ach = ok(await m1.c.from("achievements").insert({ title: "성과 1", kind: "article" }).select().single());
  assert.equal(ok(await m1.c.from("achievements").update({ sort_order: 3 }).eq("id", ach.id).select()).length, 1);
  assert.equal((await m2.c.from("achievements").update({ sort_order: 1 }).eq("id", ach.id).select()).data.length, 0);
  // 좋아하는 책: 주인만, 단 안의 순서
  const f1 = ok(await m1.c.from("favorite_books").insert({ title: "순서 책 1", shelf: 1 }).select().single());
  assert.equal(ok(await m1.c.from("favorite_books").update({ sort_order: 5, shelf: 1 }).eq("id", f1.id).select())[0].sort_order, 5);
  assert.equal((await m2.c.from("favorite_books").update({ sort_order: 1 }).eq("id", f1.id).select()).data.length, 0);
});

await t("좋아하는 책장 단 이름: 주인만 짓고, 이웃은 본다", async () => {
  const nm = (u) => u.c.from("favorite_shelf_names");
  ok(await nm(m1).upsert({ shelf: 1, name: "여행" }, { onConflict: "owner_id,shelf" }));
  ok(await nm(m1).upsert({ shelf: 1, name: "어릴 때 읽은 책" }, { onConflict: "owner_id,shelf" }));              // 같은 단은 이름이 바뀐다
  ok(await nm(m1).upsert({ shelf: 3, name: "밤에 읽는 책" }, { onConflict: "owner_id,shelf" }));
  const rows = ok(await nm(m2).select("shelf,name").eq("owner_id", m1.id)).sort((x, y) => x.shelf - y.shelf);       // 이웃도 본다
  assert.deepEqual(rows, [{ shelf: 1, name: "어릴 때 읽은 책" }, { shelf: 3, name: "밤에 읽는 책" }]);
  assert.equal(ok(await nm(outside[0]).select("*").eq("owner_id", m1.id)).length, 0);                                // 마을 밖은 못 본다
  assert.ok((await nm(m1).upsert({ shelf: 2, name: "   " }, { onConflict: "owner_id,shelf" })).error);               // 빈 이름 불가
  assert.ok((await nm(m1).upsert({ shelf: 2, name: "가".repeat(21) }, { onConflict: "owner_id,shelf" })).error);     // 20자까지
  assert.ok((await nm(m1).upsert({ shelf: 5, name: "다섯째" }, { onConflict: "owner_id,shelf" })).error);           // 단은 1~4
  ok(await nm(m2).upsert({ shelf: 1, name: "내 책장 이름" }, { onConflict: "owner_id,shelf" }));                       // 이웃이 같은 단에 이름을 지어도 자기 책장에만 붙는다
  assert.equal(ok(await nm(m1).select("name").eq("owner_id", m1.id).eq("shelf", 1).single()).name, "어릴 때 읽은 책");   // 내 책장 이름은 그대로
  assert.equal(ok(await nm(m1).select("name").eq("owner_id", m2.id).eq("shelf", 1).single()).name, "내 책장 이름");
  assert.equal((await nm(m2).delete().eq("owner_id", m1.id).select()).data?.length ?? 0, 0);                         // 남이 지우지 못한다
  assert.equal(ok(await nm(m1).delete().eq("shelf", 3).select()).length, 1);                                         // 주인은 기본 이름으로 되돌릴 수 있다
});

await t("건네기 간식 종류", async () => {
  for (const kind of ["mochi", "yakgwa", "tangerine", "apple", "minishell", "haribo"]) ok(await m1.c.rpc("send_gift", { p_village: village, p_target: m2.id, p_kind: kind, p_note: "맛있게 드세요" }));
  assert.ok((await m1.c.rpc("send_gift", { p_village: village, p_target: m2.id, p_kind: "pizza", p_note: "" })).error);               // 정해진 종류만
  const desk = ok(await m3.c.rpc("desk_gifts", { p_owner: m2.id })).map((g) => g.kind);
  assert.ok(desk.includes("haribo") && desk.includes("yakgwa"));                                                                       // 책상 위에는 종류만 보인다
});

await t("접속 중이면 내가 속한 모든 마을에서 온라인", async () => {
  if (!process.env.SUPABASE_SERVICE_KEY) return;
  const sadmin = createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const u = await user(901);
  const v1 = ok(await u.c.rpc("create_village", { p_name: "첫 마을" })), v2 = ok(await u.c.rpc("create_village", { p_name: "옆 마을" }));
  const row = async (v) => ok(await sadmin.from("research_status").select("last_seen_at,left_at,status").eq("village_id", v).eq("user_id", u.id).single());
  const old = new Date(Date.now() - 600_000).toISOString();
  // 옆 마을 자리가 오래됐어도 첫 마을에서 heartbeat 를 보내면 옆 마을도 접속 중으로 갱신된다
  await sadmin.from("research_status").update({ last_seen_at: old, left_at: old }).eq("village_id", v2).eq("user_id", u.id);
  ok(await u.c.rpc("heartbeat", { p_village: v1 }));
  const r2 = await row(v2);
  assert.ok(new Date(r2.last_seen_at).getTime() > Date.now() - 20_000); assert.equal(r2.left_at, null);
  // 탭을 닫으면 모든 마을에서 오프라인
  ok(await u.c.rpc("go_away", { p_village: v1 }));
  assert.ok((await row(v2)).left_at); assert.ok((await row(v1)).left_at);
  // 다시 들어오면 오래 비웠던 마을의 '집중 연구'는 '휴식'으로 되돌아가고 모든 마을이 접속 중
  await sadmin.from("research_status").update({ status: "focus" }).eq("village_id", v2).eq("user_id", u.id);
  await sadmin.from("research_status").update({ last_seen_at: old }).eq("village_id", v2).eq("user_id", u.id);
  ok(await u.c.rpc("enter_village", { p_village: v1 }));
  const r3 = await row(v2);
  assert.equal(r3.status, "rest"); assert.equal(r3.left_at, null); assert.ok(new Date(r3.last_seen_at).getTime() > Date.now() - 20_000);
  // 방금까지 있던 마을의 상태는 그대로 (자리 비운 적 없으니 되돌리지 않는다)
  await sadmin.from("research_status").update({ status: "library" }).eq("village_id", v2).eq("user_id", u.id);
  ok(await u.c.rpc("enter_village", { p_village: v1 }));
  assert.equal((await row(v2)).status, "library");
});

await t("이사 떡 돌리기: 마을마다 한 번, 이웃 모두에게, 잘 먹을게요 답례", async () => {
  const nf = async (u, kind) => ok(await u.c.from("notifications").select("*").eq("kind", kind));
  const members = ok(await a.c.from("village_members").select("user_id"));
  const others = members.filter((m) => m.user_id !== m1.id);
  assert.equal(ok(await m1.c.rpc("give_moving_cakes", { p_village: village, p_kind: "songpyeon", p_note: "새로 이사 왔어요" })), others.length);
  assert.match((await m1.c.rpc("give_moving_cakes", { p_village: village, p_kind: "siru", p_note: "" })).error.message, /already_given/);   // 마을마다 한 번
  assert.ok((await m2.c.rpc("give_moving_cakes", { p_village: village, p_kind: "kimbap", p_note: "" })).error);                        // 정해진 떡만
  assert.ok((await outside[0].c.rpc("give_moving_cakes", { p_village: village, p_kind: "siru", p_note: "" })).error);                  // 마을 밖은 못 돌린다
  for (const u of [a, m2]) {
    const g = ok(await u.c.from("gifts").select("kind,note,from_user").eq("from_user", m1.id).eq("kind", "songpyeon"));
    assert.equal(g.length, 1); assert.equal(g[0].kind, "songpyeon"); assert.equal(g[0].note, "새로 이사 왔어요");
    const n = await nf(u, "moving_cake");
    assert.equal(n.length, 1); assert.equal(n[0].actor_id, m1.id); assert.equal(n[0].summary, "songpyeon:새로 이사 왔어요");
  }
  assert.equal((await nf(m1, "moving_cake")).length, 0);                                                                       // 나에게는 안 간다
  assert.equal(ok(await m2.c.from("moving_cakes").select("*")).length, 0);                                                          // 남이 돌렸는지는 기록 표에서 안 보인다
  assert.equal(ok(await m1.c.from("moving_cakes").select("*")).length, 1);
  // 답례: 떡을 돌린 사람에게만, 같은 사람에게 한 번
  ok(await m2.c.rpc("thank_moving_cake", { p_village: village, p_target: m1.id }));
  assert.equal((await nf(m1, "moving_thanks")).length, 1);
  assert.match((await m2.c.rpc("thank_moving_cake", { p_village: village, p_target: m1.id })).error.message, /already_thanked/);
  assert.match((await m1.c.rpc("thank_moving_cake", { p_village: village, p_target: m2.id })).error.message, /no_cake/);
  assert.ok((await outside[0].c.rpc("thank_moving_cake", { p_village: village, p_target: m1.id })).error);
});

await t("소원구슬: 주민만 쓰고, 상태는 못 바꾸고, 하루 3개까지", async () => {
  const w1 = ok(await m1.c.from("wishes").insert({ village_id: village, body: "광장에 모닥불이 있으면 좋겠어요" }).select().single());
  assert.equal(w1.status, "new"); assert.equal(w1.author_id, m1.id);
  assert.equal(ok(await m2.c.from("wishes").select("*")).length, 1);                                  // 같은 마을 주민은 목록을 본다
  assert.equal(ok(await outside[0].c.from("wishes").select("*")).length, 0);                          // 마을 밖은 못 본다
  assert.ok((await outside[0].c.from("wishes").insert({ village_id: village, body: "침입" })).error);
  assert.ok((await m1.c.from("wishes").insert({ village_id: village, body: "   " })).error);          // 빈 소원 불가
  assert.ok((await m1.c.from("wishes").insert({ village_id: village, body: "가짜 상태", status: "done" })).error); // 상태는 정할 수 없다
  assert.equal((await m1.c.from("wishes").update({ status: "done", reply: "내가 처리함" }).eq("id", w1.id).select()).data?.length ?? 0, 0);
  assert.equal((await m2.c.from("wishes").delete().eq("id", w1.id).select()).data.length, 0);          // 남의 소원은 못 지운다
  ok(await m1.c.from("wishes").insert({ village_id: village, body: "두 번째 소원" }));
  ok(await m1.c.from("wishes").insert({ village_id: village, body: "세 번째 소원" }));
  assert.match((await m1.c.from("wishes").insert({ village_id: village, body: "네 번째 소원" })).error.message, /too_many_wishes/);
  ok(await m2.c.from("wishes").insert({ village_id: village, body: "다른 사람은 따로 센다" }));
  assert.equal((await m1.c.from("wishes").delete().eq("id", w1.id).select()).data.length, 1);          // 대기 중인 내 소원은 거둘 수 있다
  if (process.env.SUPABASE_SERVICE_KEY) {
    const sadmin = createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    await sadmin.from("wishes").update({ status: "doing" }).eq("author_id", m2.id);
    const mine = ok(await m2.c.from("wishes").select("id").eq("author_id", m2.id));
    assert.equal((await m2.c.from("wishes").delete().eq("id", mine[0].id).select()).data.length, 0);   // 처리 중인 소원은 못 거둔다
  }
});

await t("비석 이벤트: 정해진 한 사람만 부수고, 소원이 이뤄진다", async () => {
  if (!process.env.SUPABASE_SERVICE_KEY) return;
  const sadmin = createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const wish = ok(await m2.c.from("wishes").insert({ village_id: village, body: "비석에서 도망치고 싶어요" }).select().single());
  ok(await sadmin.from("monuments").insert({ village_id: village, target_user: m2.id, wish_id: wish.id }));
  assert.equal(ok(await m1.c.from("monuments").select("*")).length, 1);                                   // 마을 주민은 비석이 있는 걸 본다
  assert.equal(ok(await outside[0].c.from("monuments").select("*")).length, 0);                           // 마을 밖은 못 본다
  assert.ok((await m1.c.from("monuments").insert({ village_id: village, target_user: m1.id })).error);    // 비석은 서버만 세운다
  assert.equal((await m1.c.from("monuments").update({ broken_at: new Date().toISOString() }).eq("village_id", village).select()).data?.length ?? 0, 0);
  for (const u of [m1, a, outside[0]]) assert.ok((await u.c.rpc("break_monument", { p_village: village })).error);   // 대상자가 아니면 못 부순다
  assert.equal(ok(await m1.c.from("monuments").select("broken_at").single()).broken_at, null);
  const at = ok(await m2.c.rpc("break_monument", { p_village: village }));
  assert.ok(at);
  assert.equal(ok(await m1.c.from("monuments").select("broken_at").single()).broken_at !== null, true);
  assert.ok((await m2.c.rpc("break_monument", { p_village: village })).error);                            // 한 번만
  const w = ok(await m1.c.from("wishes").select("status,reply").eq("id", wish.id).single());
  assert.equal(w.status, "done"); assert.match(w.reply, /탈출/);
});

await t("스터디 공지: 만들기·검증·권한·정해진 시간에 마을 모두에게 알림", async () => {
  const zoom = "https://us02web.zoom.us/j/123456789";
  const base = { village_id: village, title: "새벽 독서", days: [1, 3, 5], at_time: "09:30", lead_min: 0, zoom_url: zoom };
  assert.ok((await m1.c.from("study_schedules").insert({ ...base, zoom_url: "https://evil.example.com/j/1" })).error);   // zoom 주소만
  assert.ok((await m1.c.from("study_schedules").insert({ ...base, days: [] })).error);
  assert.ok((await m1.c.from("study_schedules").insert({ ...base, days: [9] })).error);
  assert.ok((await outside[1].c.from("study_schedules").insert(base)).error);                                           // 마을 밖
  const s1 = ok(await m1.c.from("study_schedules").insert(base).select("id").single());
  assert.equal(ok(await m2.c.from("study_schedules").select("id").eq("id", s1.id)).length, 1);                            // 마을원은 본다
  assert.equal(ok(await outside[1].c.from("study_schedules").select("id").eq("id", s1.id)).length, 0);
  await m2.c.from("study_schedules").update({ title: "남의 것" }).eq("id", s1.id);
  assert.equal(ok(await m1.c.from("study_schedules").select("title").eq("id", s1.id).single()).title, "새벽 독서");     // 남은 못 고친다
  assert.ok((await m1.c.rpc("fire_study_alarms")).error);                                                                 // 일반 사용자는 실행 불가
  const sv = createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  // 지금(한국 시각)에 맞춰 두면 한 번만 울린다
  const kst = new Date(Date.now() + 9 * 3600e3);
  await sv.from("study_schedules").update({ days: [kst.getUTCDay()], at_time: kst.toISOString().slice(11, 16) + ":00", last_fired_on: null }).eq("id", s1.id);
  const n1 = ok(await sv.rpc("fire_study_alarms")); assert.ok(n1 >= 1);
  const got = ok(await m2.c.from("notifications").select("summary,kind,actor_id").eq("kind", "study_alarm"));
  assert.ok(got.some((g) => g.summary.startsWith(s1.id + "|")));
  assert.ok(got.every((g) => g.actor_id === m1.id));
  ok(await sv.rpc("fire_study_alarms"));
  assert.equal(ok(await m2.c.from("notifications").select("id").eq("kind", "study_alarm")).length, got.length);           // 같은 날 두 번 울리지 않는다
  assert.equal(ok(await m1.c.from("notifications").select("id").eq("kind", "study_alarm")).length >= 1, true);           // 만든 사람도 받는다
  // 받을 사람을 고르면 그 사람들에게만 간다
  const s2 = ok(await m1.c.from("study_schedules").insert({ ...base, title: "선택 스터디", recipients: [m1.id, m2.id] }).select("id").single());
  await sv.from("study_schedules").update({ days: [kst.getUTCDay()], at_time: kst.toISOString().slice(11, 16) + ":00", last_fired_on: null }).eq("id", s2.id);
  ok(await sv.rpc("fire_study_alarms"));
  const has = async (x) => ok(await x.c.from("notifications").select("summary").eq("kind", "study_alarm")).some((g) => g.summary.startsWith(s2.id + "|"));
  assert.equal(await has(m1), true); assert.equal(await has(m2), true); assert.equal(await has(a), false);
  ok(await m1.c.from("study_schedules").delete().eq("id", s2.id));
  for (let i = 0; i < 9; i++) ok(await m1.c.from("study_schedules").insert({ ...base, title: `s${i}` }));
  assert.match((await m1.c.from("study_schedules").insert(base)).error?.message ?? "", /too_many_schedules/);
  ok(await a.c.from("study_schedules").delete().eq("id", s1.id));                                                         // 마을 관리자는 지울 수 있다
});

await t("공동 공부 목표: 고른 사람만, 모두 완료하면 끝나고 알림", async () => {
  const bad = await m1.c.rpc("create_study_goal", { p_village: village, p_title: "혼자", p_note: "", p_members: [] });
  assert.match(bad.error?.message ?? "", /bad_members/);                                                          // 혼자는 안 된다
  assert.ok((await outside[1].c.rpc("create_study_goal", { p_village: village, p_title: "x", p_note: "", p_members: [m1.id] })).error); // 마을 밖
  assert.match((await m1.c.rpc("create_study_goal", { p_village: village, p_title: "x", p_note: "", p_members: [outside[1].id] })).error?.message ?? "", /bad_members/);
  const gid = ok(await m1.c.rpc("create_study_goal", { p_village: village, p_title: "논문 3편 읽기", p_note: "", p_members: [m2.id, a.id] }));
  const got = ok(await m2.c.from("notifications").select("summary,kind").eq("kind", "study_goal"));
  assert.ok(got.some((g) => g.summary === `${gid}|논문 3편 읽기|new`));
  assert.equal(ok(await m2.c.from("study_goal_members").select("user_id").eq("goal_id", gid)).length, 3);
  assert.ok((await ok(await m2.c.from("study_goals").select("id").eq("id", gid))).length === 1);
  assert.equal(ok(await outside[1].c.from("study_goals").select("id").eq("id", gid)).length, 0);
  assert.match((await outside[1].c.rpc("set_study_goal_done", { p_goal: gid, p_done: true })).error?.message ?? "", /not_member|no_goal/);
  assert.equal(ok(await m1.c.rpc("set_study_goal_done", { p_goal: gid, p_done: true })), false);
  assert.equal(ok(await m1.c.rpc("set_study_goal_done", { p_goal: gid, p_done: false })), false);                 // 취소할 수 있다
  ok(await m1.c.rpc("set_study_goal_done", { p_goal: gid, p_done: true }));
  assert.equal(ok(await m2.c.rpc("set_study_goal_done", { p_goal: gid, p_done: true })), false);
  assert.equal(ok(await a.c.rpc("set_study_goal_done", { p_goal: gid, p_done: true })), true);                   // 마지막 한 명 → 끝
  assert.ok(ok(await m1.c.from("study_goals").select("completed_at").eq("id", gid).single()).completed_at);
  assert.ok(ok(await m1.c.from("notifications").select("summary").eq("kind", "study_goal")).some((g) => g.summary === `${gid}|논문 3편 읽기|done`));
  // 같이 공부하지 않은 마을 사람에게도 알림과 책걸이 선물(송편·막걸리)이 간다
  const bystander = inside.find((x) => ![m1.id, m2.id, a.id].includes(x.id));
  assert.ok(bystander);
  assert.ok(ok(await bystander.c.from("notifications").select("summary").eq("kind", "study_goal")).some((g) => g.summary === `${gid}|논문 3편 읽기|done`));
  const kinds = ok(await bystander.c.from("gifts").select("kind,note").eq("to_user", bystander.id)).filter((g) => g.note.startsWith("책걸이 기념")).map((g) => g.kind).sort();
  assert.deepEqual(kinds, ["makgeolli", "songpyeon"]);
  assert.equal(ok(await a.c.from("gifts").select("kind").eq("to_user", a.id).eq("kind", "songpyeon")).length >= 1, true);    // 같이 한 사람도 받는다
  assert.match((await m1.c.rpc("set_study_goal_done", { p_goal: gid, p_done: false })).error?.message ?? "", /goal_completed/);
  await a.c.from("study_goals").delete().eq("id", gid);                                                           // 이룬 목표(기념 주화)는 지울 수 없다
  assert.equal(ok(await a.c.from("study_goals").select("id").eq("id", gid)).length, 1);
  const g2 = ok(await m1.c.rpc("create_study_goal", { p_village: village, p_title: "지울 목표", p_note: "", p_members: [m2.id] }));
  await a.c.from("study_goals").delete().eq("id", g2);                                                            // 진행 중인 목표는 마을 관리자가 지울 수 있다
  assert.equal(ok(await a.c.from("study_goals").select("id").eq("id", g2)).length, 0);
});

await t("기간형 공동 목표: 만들기·체크·고치기·기간이 끝나면 판정(달성/미달)", async () => {
  const sv = createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const ymd = (off) => new Date(Date.now() + 9 * 3600e3 + off * 86400e3).toISOString().slice(0, 10);
  const base = { p_village: village, p_title: "한시 읽기", p_note: "", p_members: [m2.id], p_start: ymd(0), p_end: ymd(29), p_per_week: 3 };
  assert.match((await m1.c.rpc("create_habit_goal", { ...base, p_end: ymd(3) })).error?.message ?? "", /bad_period|check/);   // 7일 미만
  assert.match((await m1.c.rpc("create_habit_goal", { ...base, p_per_week: 9 })).error?.message ?? "", /bad_period/);
  assert.match((await m1.c.rpc("create_habit_goal", { ...base, p_start: ymd(-3) })).error?.message ?? "", /bad_period/);       // 과거 시작
  assert.ok((await m1.c.rpc("create_habit_goal", { ...base, p_members: [outside[1].id] })).error);
  const gid = ok(await m1.c.rpc("create_habit_goal", base));
  assert.equal(ok(await m2.c.from("study_goals").select("kind,per_week").eq("id", gid).single()).per_week, 3);
  ok(await m1.c.rpc("set_goal_check", { p_goal: gid, p_day: ymd(0), p_on: true }));
  assert.match((await m1.c.rpc("set_goal_check", { p_goal: gid, p_day: ymd(1), p_on: true })).error?.message ?? "", /bad_day/);   // 미래
  assert.match((await m1.c.rpc("set_goal_check", { p_goal: gid, p_day: ymd(-5), p_on: true })).error?.message ?? "", /bad_day/);  // 너무 옛날
  assert.ok((await outside[1].c.rpc("set_goal_check", { p_goal: gid, p_day: ymd(0), p_on: true })).error);                     // 구성원이 아님
  assert.equal(ok(await m2.c.from("study_goal_checks").select("day").eq("goal_id", gid)).length, 1);                       // 같이 하는 사람의 체크는 보인다
  ok(await m1.c.rpc("set_goal_check", { p_goal: gid, p_day: ymd(0), p_on: false }));
  assert.match((await m1.c.rpc("set_study_goal_done", { p_goal: gid, p_done: true })).error?.message ?? "", /not_once/);        // 기간형은 완료 버튼이 없다
  // 고치기: 만든 사람·관리자만, 이름·종료일·사람
  assert.match((await m2.c.rpc("update_study_goal", { p_goal: gid, p_title: "x", p_note: "", p_members: [m2.id], p_end: ymd(29), p_per_week: 3 })).error?.message ?? "", /not_allowed/);
  ok(await m1.c.rpc("update_study_goal", { p_goal: gid, p_title: "한시 읽기 (수정)", p_note: "메모", p_members: [m2.id], p_end: ymd(20), p_per_week: 4 }));
  const g = ok(await m1.c.from("study_goals").select("title,end_date,per_week").eq("id", gid).single());
  assert.deepEqual([g.title, g.end_date, g.per_week], ["한시 읽기 (수정)", ymd(20), 4]);
  // 기간이 끝난 것으로 만들고 판정: 필요 일수 = ceil(10 * 3 / 7) = 5, 둘 다 5일 → 달성
  await sv.from("study_goals").update({ start_date: ymd(-10), end_date: ymd(-1), per_week: 3 }).eq("id", gid);
  for (const u of [m1, m2]) for (let i = 1; i <= 5; i++) await sv.from("study_goal_checks").insert({ goal_id: gid, user_id: u.id, day: ymd(-i) });
  ok(await sv.rpc("finalize_habit_goals"));
  assert.ok(ok(await m1.c.from("study_goals").select("completed_at").eq("id", gid).single()).completed_at);
  assert.ok(ok(await m2.c.from("notifications").select("summary").eq("kind", "study_goal")).some((n) => n.summary === `${gid}|한시 읽기 (수정)|done`));
  assert.ok(ok(await m2.c.from("gifts").select("kind,note").eq("to_user", m2.id)).some((x) => x.kind === "makgeolli" && x.note.includes("한시 읽기")));
  assert.match((await m1.c.rpc("update_study_goal", { p_goal: gid, p_title: "x", p_note: "", p_members: [m2.id], p_end: ymd(5), p_per_week: 3 })).error?.message ?? "", /goal_completed/);
  // 한 명이 모자라면 조용히 미달
  const g2 = ok(await m1.c.rpc("create_habit_goal", { ...base, p_title: "미달 목표" }));
  await sv.from("study_goals").update({ start_date: ymd(-10), end_date: ymd(-1) }).eq("id", g2);
  for (let i = 1; i <= 5; i++) await sv.from("study_goal_checks").insert({ goal_id: g2, user_id: m1.id, day: ymd(-i) });
  for (let i = 1; i <= 4; i++) await sv.from("study_goal_checks").insert({ goal_id: g2, user_id: m2.id, day: ymd(-i) });
  ok(await sv.rpc("finalize_habit_goals"));
  const r2 = ok(await m1.c.from("study_goals").select("completed_at,missed_at").eq("id", g2).single());
  assert.ok(!r2.completed_at && r2.missed_at);
  assert.ok(ok(await m2.c.from("notifications").select("summary").eq("kind", "study_goal")).some((n) => n.summary === `${g2}|미달 목표|missed`));
  assert.ok((await m1.c.rpc("finalize_habit_goals")).error);                                                                  // 일반 사용자는 실행 불가
  ok(await m1.c.from("study_goals").delete().eq("id", g2));
  assert.equal(ok(await m1.c.from("study_goals").select("id").eq("id", g2)).length, 0);                                       // 미달 목표는 지울 수 있다
});

await t("크리스마스 산타: 이브 밤과 25일 아침에만, 한 해 한 번, 선물이 간식 상자로", async () => {
  const sv = createClient(url, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const T = (kst) => new Date(kst + "+09:00").toISOString();
  assert.match((await sv.rpc("_claim_christmas", { p_user: m1.id, p_now: T("2026-12-24T17:59:00") })).error?.message ?? "", /not_christmas/);   // 이브 저녁 6시 전
  assert.match((await sv.rpc("_claim_christmas", { p_user: m1.id, p_now: T("2026-12-26T00:00:00") })).error?.message ?? "", /not_christmas/);
  const eve = ok(await sv.rpc("_claim_christmas", { p_user: m1.id, p_now: T("2026-12-24T21:00:00") }));
  assert.equal(eve.kind, "eve"); assert.equal(eve.snacks.length, 2); assert.ok(eve.snacks.includes("cocoa"));
  assert.match((await sv.rpc("_claim_christmas", { p_user: m1.id, p_now: T("2026-12-25T09:00:00") })).error?.message ?? "", /already/);   // 한 사람 한 번
  const morning = ok(await sv.rpc("_claim_christmas", { p_user: m2.id, p_now: T("2026-12-25T07:00:00") }));                                 // 놓친 사람은 아침에
  assert.equal(morning.kind, "morning");
  assert.equal(ok(await sv.rpc("_claim_christmas", { p_user: m3.id, p_now: T("2026-12-25T05:59:00") })).kind, "eve");                       // 아침 6시 전까지는 이브 구간
  const mine = ok(await m1.c.from("christmas_gifts").select("kind,snacks,stats").eq("year", 2026));
  assert.equal(mine.length, 1); assert.equal(ok(await m2.c.from("christmas_gifts").select("user_id")).length, 1);                         // 남의 선물은 안 보인다
  const g = ok(await m1.c.from("gifts").select("kind,note").eq("to_user", m1.id)).filter((x) => x.note.startsWith("🎅"));
  assert.equal(g.length, 2);
  assert.ok((await m1.c.rpc("_claim_christmas", { p_user: m1.id, p_now: T("2026-12-24T21:00:00") })).error);                                // 일반 사용자는 내부 함수를 못 쓴다
  assert.ok((await m1.c.rpc("claim_christmas")).error);                                                                                     // 지금은 크리스마스가 아니다
  await sv.from("app_settings").upsert({ key: "now_override", value: T("2026-12-24T22:00:00") });
  const viaApi = ok(await a.c.rpc("claim_christmas")); assert.equal(viaApi.kind, "eve");                                                  // 시계를 바꾸면 공개 함수도 이브로 본다
  await sv.from("app_settings").delete().eq("key", "now_override");
});

await t("지도에서 걷기: 광장에서 쉬는 상태가 되고 위치가 남으며, 상태를 바꾸면 위치가 지워진다", async () => {
  const pos = async (u) => ok(await u.c.from("research_status").select("status,pos_x,pos_y").eq("village_id", village).eq("user_id", u.id).single());
  ok(await m1.c.from("research_status").update({ status: "open" }).eq("village_id", village).eq("user_id", m1.id));
  ok(await m1.c.rpc("walk_to", { p_village: village, p_x: 120, p_y: 200 }));
  assert.deepEqual(await pos(m1), { status: "rest", pos_x: 120, pos_y: 200 });                 // 걸으면 광장에서 쉬는 중이 된다
  assert.equal((await pos(m2)).pos_x, null);                                                    // 남의 위치는 그대로
  assert.deepEqual((await ok(await m2.c.from("research_status").select("pos_x,pos_y").eq("user_id", m1.id).eq("village_id", village).single())), { pos_x: 120, pos_y: 200 });   // 이웃도 볼 수 있다
  assert.match((await m1.c.rpc("walk_to", { p_village: village, p_x: 999, p_y: 5 })).error?.message ?? "", /bad_pos|check/);
  assert.ok((await outside[1].c.rpc("walk_to", { p_village: village, p_x: 100, p_y: 100 })).error);   // 마을 밖
  ok(await m1.c.from("research_status").update({ status: "library" }).eq("village_id", village).eq("user_id", m1.id));
  assert.deepEqual(await pos(m1), { status: "library", pos_x: null, pos_y: null });             // 상태를 바꾸면 원래 자리로
  ok(await m1.c.from("research_status").update({ status: "focus" }).eq("village_id", village).eq("user_id", m1.id));
  assert.match((await m1.c.rpc("walk_to", { p_village: village, p_x: 100, p_y: 100 })).error?.message ?? "", /cannot_walk/);   // 집중 연구 중엔 못 걷는다
  ok(await m1.c.from("research_status").update({ status: "rest" }).eq("village_id", village).eq("user_id", m1.id));
});

await t("연구실 새 글 표시: 새 글이 있으면 집이 반짝, 보고 나면 꺼진다(내가 쓴 글은 안 센다)", async () => {
  const news = async (who) => ok(await who.c.rpc("rooms_with_news", { p_village: village }));
  assert.ok(!(await news(m1)).includes(a.id));
  ok(await a.c.from("whiteboard_items").insert({ body: "새 고민" }));
  assert.ok((await news(m1)).includes(a.id));                     // 이웃에게 반짝
  assert.ok(!(await news(a)).includes(a.id));                     // 내 집은 아님
  ok(await m1.c.rpc("mark_room_seen", { p_owner: a.id }));
  assert.ok(!(await news(m1)).includes(a.id));                    // 보고 나면 꺼짐
  ok(await m1.c.from("postits").insert({ owner_id: a.id, body: "내가 붙임" }));
  assert.ok(!(await news(m1)).includes(a.id));                    // 내가 쓴 글은 새 글이 아님
  ok(await m2.c.from("postits").insert({ owner_id: a.id, body: "다른 이웃이 붙임" }));
  assert.ok((await news(m1)).includes(a.id));                     // 다른 사람이 쓰면 다시 반짝
  // 공개 일지: 하루에 한 번만 새 글로 친다
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
  ok(await m2.c.from("daily_logs").upsert({ log_date: today, body: "오늘 일지", shared_villages: [village] }));
  assert.ok((await news(m1)).includes(m2.id));                    // 처음 올라온 일지는 새 글
  ok(await m1.c.rpc("mark_room_seen", { p_owner: m2.id }));
  ok(await m2.c.from("daily_logs").upsert({ log_date: today, body: "오늘 일지, 이어서 씀", shared_villages: [village] }));
  assert.ok(!(await news(m1)).includes(m2.id));                   // 본 뒤 같은 날 고쳐도 다시 알리지 않는다
  assert.equal((await m1.c.from("room_seen").select("*").eq("viewer_id", a.id)).data.length, 0);   // 남의 확인 기록은 못 본다
});

await t("대문 빗장: 마을장만 걸 수 있고, 걸면 초대 링크가 없어져 새 주민이 못 들어온다", async () => {
  assert.match((await m1.c.rpc("set_village_gate", { p_village: village, p_locked: true })).error?.message ?? "", /not_admin/);   // 마을장이 아니면 못 건다
  ok(await a.c.rpc("set_village_gate", { p_village: village, p_locked: true }));
  assert.equal(ok(await a.c.from("village_invites").select("code").eq("village_id", village)).length, 0);   // 남은 초대 링크 삭제
  assert.match((await a.c.rpc("create_invite", { p_village: village })).error?.message ?? "", /village_locked/);
  assert.match((await outside[0].c.rpc("join_village", { p_code: code })).error?.message ?? "", /invalid_invite|village_locked/);
  ok(await a.c.rpc("set_village_gate", { p_village: village, p_locked: false }));                 // 풀면 다시 초대 가능
  code = ok(await a.c.rpc("create_invite", { p_village: village }));
});

await t("내 마을 순서: 내 것만 저장하고 읽는다", async () => {
  ok(await m1.c.from("user_prefs").upsert({ village_order: [village] }, { onConflict: "user_id" }));
  assert.equal(ok(await m1.c.from("user_prefs").select("village_order")).length, 1);
  assert.equal(ok(await m2.c.from("user_prefs").select("village_order")).length, 0);          // 남의 설정은 안 보인다
  assert.ok((await m2.c.from("user_prefs").insert({ user_id: m1.id, village_order: [] })).error);   // 남의 이름으로는 못 만든다
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
