"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

/** 재설정 메일의 링크로 열렸는지: 주소 뒤의 토큰은 곧 지워지므로 불러오는 순간 한 번 기억해 둔다 */
const OPENED_FOR_RECOVERY = typeof window !== "undefined" && /type=recovery/.test(window.location.hash + window.location.search);

export const PROFILE_COLUMNS = "id, display_name, field, bio, keywords, avatar, share_study_time, onboarded, lab_style";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(OPENED_FOR_RECOVERY);   // 비밀번호 재설정 메일의 링크로 들어온 상태
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
      if (!s) {
        setProfile(null);
        setReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase().from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
    if (!data) {
      // 계정이 삭제되었거나 세션이 더 이상 유효하지 않음
      await supabase().auth.signOut({ scope: "local" });
      return;
    }
    setProfile(data as Profile);
    setReady(true);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 로그인 직후 프로필을 불러온다
    void reloadProfile();
  }, [reloadProfile]);

  return { session, userId, profile, ready, reloadProfile, setProfile, recovery, endRecovery: () => setRecovery(false) };
}
