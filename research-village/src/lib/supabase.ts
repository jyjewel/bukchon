import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

/** 브라우저용 Supabase 클라이언트. 공개(anon) 키만 사용하며, 모든 접근 제어는 DB의 RLS가 담당한다. */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

const ERRORS: Record<string, string> = {
  village_full: "이 마을은 이미 6명이 모두 살고 있어요.",
  invalid_invite: "초대 링크가 올바르지 않거나 만료되었어요. 마을 관리자에게 새 링크를 부탁해 보세요.",
  already_in_village: "이미 다른 마을에 살고 있어요. 지금은 한 마을에만 살 수 있어요.",
  not_admin: "마을 관리자만 할 수 있는 일이에요.",
  not_member: "이 마을의 주민이 아니에요.",
  not_available: "지금은 대화를 받을 수 있는 상태가 아니에요. 집 앞 책상에 나와 있는 주민에게만 신청할 수 있어요.",
  "Invalid login credentials": "이메일 또는 비밀번호가 맞지 않아요.",
  "User already registered": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "Email not confirmed": "이메일 인증이 아직 끝나지 않았어요. 메일함을 확인해 주세요.",
};

export function errorMessage(e: unknown): string {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
  for (const k of Object.keys(ERRORS)) if (msg.includes(k)) return ERRORS[k];
  if (/password/i.test(msg) && /6|short|weak/i.test(msg)) return "비밀번호는 6자 이상이어야 해요.";
  if (/fetch|network/i.test(msg)) return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
  return `문제가 생겼어요: ${msg}`;
}
