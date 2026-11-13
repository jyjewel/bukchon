import { errorMessage, supabase } from "./supabase";

/** 공개 키라서 코드에 있어도 된다. 짝이 되는 비밀 키는 서버(push_config)에만 있다. */
export const VAPID_PUBLIC_KEY = "BMpHboVy53Exa4fVF1M87Y6sYAD-VpGLpceUOa0DJGKr0KaAKwFeReJMqv9n_4SAI6HdmVvNh8yW-lENIb6Wk9Q";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
function keyBytes(b64: string) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function currentSub() {
  const reg = await navigator.serviceWorker.getRegistration(`${base}/`);
  return (await reg?.pushManager.getSubscription()) ?? null;
}
async function save(sub: PushSubscription) {
  const j = sub.toJSON();
  const { error } = await supabase().rpc("save_push_subscription", { p_endpoint: sub.endpoint, p_p256dh: j.keys?.p256dh ?? "", p_auth: j.keys?.auth ?? "" });
  return error ? errorMessage(error) : null;
}

export async function pushState(): Promise<PushState> {
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!ok) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await currentSub()) ? "on" : "off";
}

/** 이 기기에서 알림 받기. 오류 문구를 돌려주고 성공이면 null */
export async function enablePush(): Promise<string | null> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "알림 권한이 허용되지 않았어요. 브라우저(또는 폰) 설정에서 허용해 주세요.";
    const reg = await navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    return await save(sub);
  } catch (e) {
    return `알림을 켜지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`;
  }
}

/** 이 기기 알림 끄기 */
export async function disablePush(): Promise<string | null> {
  try {
    const sub = await currentSub();
    if (sub) {
      await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    return null;
  } catch (e) {
    return `알림을 끄지 못했어요. (${e instanceof Error ? e.message : "알 수 없는 오류"})`;
  }
}

/** 로그인할 때: 이미 켜 둔 기기라면 지금 계정에 다시 연결한다(같은 폰에서 계정이 바뀐 경우 포함) */
export async function syncPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return;
    const sub = await currentSub();
    if (sub) await save(sub);
  } catch { /* 알림은 부가 기능이라 조용히 넘어간다 */ }
}

/** 로그아웃할 때: 이 기기로 이전 계정의 알림이 오지 않게 서버의 연결만 끊는다(브라우저 구독은 남겨 두어 다음 로그인에 다시 잇는다) */
export async function detachPush() {
  try {
    const sub = "serviceWorker" in navigator ? await currentSub() : null;
    if (sub) await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  } catch { /* 무시 */ }
}
