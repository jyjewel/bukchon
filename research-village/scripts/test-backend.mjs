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

await t("집 꾸미기: 자기 집만, 소유자는 못 바꾼다", async () => {
  ok(await m1.c.from("houses").update({ style: { roof: "#f00" } }).eq("owner_id", m1.id));
  assert.equal((await m1.c.from("houses").update({ style: { roof: "#0f0" } }).eq("owner_id", a.id).select()).data.length, 0);
  assert.ok((await m1.c.from("houses").update({ owner_id: m1.id }).eq("owner_id", a.id)).error);
});

await t("다이어리 공개 범위: 나만 / 마을 / 선택한 주민", async () => {
  const mk = async (visibility) => ok(await m1.c.from("diary_entries")
    .insert({ village_id: village, body: visibility, visibility }).select().single());
  const priv = await mk("private"), vil = await mk("village"), sel = await mk("selected");
  ok(await m1.c.from("entry_permissions").insert({ entry_id: sel.id, user_id: m2.id }));
  const ids = async (x) => ok(await x.c.from("diary_entries").select("id")).map((e) => e.id).sort();
  assert.deepEqual(await ids(m1), [priv.id, vil.id, sel.id].sort());
  assert.deepEqual(await ids(m2), [vil.id, sel.id].sort());
  assert.deepEqual(await ids(m3), [vil.id]);
  assert.deepEqual(await ids(outside[0]), []);
  // 남의 글에 권한을 부여하거나, 마을 밖 사람에게 공개할 수 없다
  assert.ok((await m3.c.from("entry_permissions").insert({ entry_id: sel.id, user_id: m3.id })).error);
  assert.ok((await m1.c.from("entry_permissions").insert({ entry_id: sel.id, user_id: outside[0].id })).error);
  // 남의 글 수정/삭제 불가, 남의 이름으로 작성 불가
  assert.equal((await m2.c.from("diary_entries").update({ body: "hack" }).eq("id", vil.id).select()).data.length, 0);
  assert.equal((await m2.c.from("diary_entries").delete().eq("id", vil.id).select()).data.length, 0);
  assert.ok((await m2.c.from("diary_entries").insert({ village_id: village, body: "x", author_id: m1.id })).error);
  assert.ok((await outside[0].c.from("diary_entries").insert({ village_id: village, body: "x" })).error);
});

await t("연구실: 화이트보드 댓글·포스트잇·알림", async () => {
  const notifs = async (x) => ok(await x.c.from("notifications").select("*").order("created_at"));
  const item = ok(await m1.c.from("whiteboard_items").insert({ village_id: village, owner_id: m1.id, body: "방각본 간행 연대를 어떻게 추정할까?" }).select().single());
  // 주민은 보고, 마을 밖 사람은 못 본다 / 남의 이름으로 쓰기 불가
  assert.equal(ok(await m2.c.from("whiteboard_items").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("whiteboard_items").select("*")).length, 0);
  assert.ok((await m2.c.from("whiteboard_items").insert({ village_id: village, owner_id: m1.id, body: "대신 씀" })).error);
  assert.equal((await m2.c.from("whiteboard_items").update({ resolved: true }).eq("id", item.id).select()).data.length, 0);
  // 댓글 → 주인에게 알림, 자기 댓글은 알림 없음
  ok(await m2.c.from("whiteboard_comments").insert({ item_id: item.id, village_id: village, body: "판식과 지질을 보세요" }));
  let n1 = await notifs(m1);
  assert.equal(n1.length, 1); assert.equal(n1[0].kind, "comment"); assert.equal(n1[0].actor_id, m2.id); assert.equal(n1[0].room_owner_id, m1.id);
  assert.equal((await notifs(m2)).length, 0);
  ok(await m1.c.from("whiteboard_comments").insert({ item_id: item.id, village_id: village, body: "고맙습니다" }));
  assert.equal((await notifs(m2)).length, 1); // 먼저 댓글 단 사람에게도 알림
  ok(await m3.c.from("whiteboard_comments").insert({ item_id: item.id, village_id: village, body: "저도 궁금해요" }));
  assert.equal((await notifs(m1)).length, 2); assert.equal((await notifs(m2)).length, 2);
  assert.ok((await outside[0].c.from("whiteboard_comments").insert({ item_id: item.id, village_id: village, body: "침입" })).error);
  // 댓글 삭제: 작성자나 화이트보드 주인만
  const cs = ok(await m1.c.from("whiteboard_comments").select("*").eq("item_id", item.id));
  const c3 = cs.find((c) => c.author_id === m3.id);
  assert.equal((await m2.c.from("whiteboard_comments").delete().eq("id", c3.id).select()).data.length, 0);
  assert.equal((await m1.c.from("whiteboard_comments").delete().eq("id", c3.id).select()).data.length, 1);
  // 포스트잇
  ok(await m2.c.from("postits").insert({ village_id: village, owner_id: m1.id, body: "응원합니다", color: "#ffb3c8" }));
  assert.equal((await notifs(m1)).filter((n) => n.kind === "postit").length, 1);
  ok(await m1.c.from("postits").insert({ village_id: village, owner_id: m1.id, body: "나에게 메모" })); // 내 벽: 알림 없음
  assert.equal((await notifs(m1)).filter((n) => n.kind === "postit").length, 1);
  assert.ok((await m2.c.from("postits").insert({ village_id: village, owner_id: outside[0].id, body: "x" })).error); // 마을 밖 사람의 방에는 못 붙인다
  assert.ok((await m2.c.from("postits").insert({ village_id: village, owner_id: m1.id, body: "x", author_id: m3.id })).error);
  assert.ok((await m2.c.from("postits").insert({ village_id: village, owner_id: m1.id, body: "x", color: "#000000" })).error);
  assert.ok((await outside[0].c.from("postits").insert({ village_id: village, owner_id: m1.id, body: "침입" })).error);
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
  ok(await m1.c.from("achievements").insert({ village_id: village, owner_id: m1.id, title: "조선 후기 방각본 연구", kind: "article", year: 2025, link_url: riss }));
  assert.equal(ok(await m2.c.from("achievements").select("*")).length, 1);
  assert.equal(ok(await outside[0].c.from("achievements").select("*")).length, 0);
  assert.ok((await m1.c.from("achievements").insert({ village_id: village, owner_id: m1.id, title: "x", link_url: "javascript:alert(1)" })).error);
  assert.ok((await m2.c.from("achievements").insert({ village_id: village, owner_id: m1.id, title: "대신" })).error);
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
