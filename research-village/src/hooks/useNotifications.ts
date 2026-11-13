"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AppNotification } from "@/lib/types";

/** 내 알림(포스트잇·댓글). 새 알림이 오면 onNew 가 불린다. */
export function useNotifications(userId: string, onNew: (n: AppNotification) => void) {
  const [list, setList] = useState<AppNotification[]>([]);
  const [names, setNames] = useState<Record<string, string>>({}); // 다른 마을 주민의 이름 (알림 문구용)
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);

  const load = useCallback(async () => {
    const { data } = await supabase().from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
    if (!data) return;
    setList(data as AppNotification[]);
    const ids = [...new Set(data.flatMap((n) => [n.actor_id as string, n.room_owner_id as string]))];
    if (ids.length) {
      const p = await supabase().from("profiles").select("id, display_name").in("id", ids);
      if (p.data) setNames(Object.fromEntries(p.data.map((x) => [x.id as string, x.display_name as string])));
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`notif:${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as AppNotification;
        setList((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
        onNewRef.current(n);
        void load(); // 다른 마을 주민의 이름도 함께 가져온다
      })
      .subscribe();
    const poll = setInterval(() => void load(), 60_000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [userId, load]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const at = new Date().toISOString();
      setList((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? at } : n)));
      await supabase().from("notifications").update({ read_at: at }).in("id", ids).is("read_at", null);
    },
    [],
  );
  const unread = list.filter((n) => !n.read_at).length;
  return { list, names, unread, markRead, reload: load };
}
