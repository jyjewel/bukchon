"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export const PROFILE_COLUMNS = "id, display_name, field, bio, keywords, avatar, share_study_time, onboarded";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
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

  return { session, userId, profile, ready, reloadProfile, setProfile };
}
