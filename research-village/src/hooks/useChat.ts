"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, Conversation } from "@/lib/types";

/** 1:1 대화. 신청·수락 상태와 읽지 않은 메시지를 실시간으로 따라간다. */
export function useChat(userId: string, villageId: string, onIncoming: (c: Conversation) => void) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef(new Map<string, string | null>());
  const first = useRef(true);
  const incoming = useRef(onIncoming);
  useEffect(() => {
    incoming.current = onIncoming;
  }, [onIncoming]);

  const load = useCallback(async () => {
    const { data } = await supabase().from("conversations").select("*").eq("village_id", villageId).order("updated_at", { ascending: false });
    if (!data) return;
    const list = data as Conversation[];
    // 새로 도착한 메시지를 감지해 알린다 (처음 불러올 때는 제외)
    for (const c of list) {
      const prev = seen.current.get(c.id);
      if (!first.current && c.last_sender && c.last_sender !== userId && c.last_message_at && c.last_message_at !== prev) incoming.current(c);
      seen.current.set(c.id, c.last_message_at);
    }
    first.current = false;
    setConvs(list);
    setLoaded(true);
  }, [villageId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`chat:${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void load())
      .subscribe();
    const poll = setInterval(() => void load(), 30_000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [load, userId]);

  const unreadOf = useCallback(
    (c: Conversation) => {
      const mine = c.user_a === userId ? c.read_a : c.read_b;
      return c.status === "active" && c.last_sender !== null && c.last_sender !== userId && !!c.last_message_at && c.last_message_at > mine;
    },
    [userId],
  );
  const pendingIncoming = useMemo(() => convs.filter((c) => c.status === "pending" && c.user_b === userId), [convs, userId]);
  const badge = pendingIncoming.length + convs.filter(unreadOf).length;
  return { convs, loaded, reload: load, unreadOf, pendingIncoming, badge };
}

/** 한 대화방의 메시지 (실시간) */
export function useMessages(convId: string | null, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const load = useCallback(async () => {
    if (!convId) return;
    const { data } = await supabase().from("messages").select("*").eq("conversation_id", convId).order("created_at").limit(500);
    if (data) setMessages(data as ChatMessage[]);
  }, [convId]);

  useEffect(() => {
    if (!convId || !enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 대화방을 열면 불러온다
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`msgs:${convId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (p) => {
        const m = p.new as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .subscribe();
    const poll = setInterval(() => void load(), 20_000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [convId, enabled, load]);

  return { messages: convId ? messages : [], reload: load };
}
