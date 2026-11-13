// 새 알림·대화 메시지가 생기면 DB 트리거가 이 함수를 부른다. 받는 사람의 기기마다 웹 푸시를 보낸다.
// 함수 주소·비밀 값·VAPID 키는 push_config 표에 있고, 이 함수는 서비스 키로만 읽는다.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pushText } from "./message.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: cfg } = await admin.from("push_config").select("key,value");
  const conf = Object.fromEntries((cfg ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  if (!conf.push_secret || req.headers.get("x-push-secret") !== conf.push_secret) return new Response("forbidden", { status: 403 });
  if (!conf.vapid_public || !conf.vapid_private) return new Response("not configured", { status: 500 });

  let body: { user_id?: string; kind?: string; actor?: string };
  try { body = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
  if (!body.user_id || !body.kind) return new Response("bad request", { status: 400 });

  const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", body.user_id);
  if (!subs?.length) return new Response("no subscriptions", { status: 200 });

  webpush.setVapidDetails("https://jyjewel.github.io/bukchon/village/", conf.vapid_public, conf.vapid_private);
  const payload = JSON.stringify(pushText(body.kind, body.actor ?? ""));
  const dead: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.id);   // 앱을 지운 기기 등: 구독을 정리한다
      else console.error("push failed", code);
    }
  }));
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);
  return new Response(JSON.stringify({ sent, removed: dead.length }), { headers: { "Content-Type": "application/json" } });
});
