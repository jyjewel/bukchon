"use client";
import { stopPoll, visibleInterval } from "@/lib/poll";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Avatar, ChatMessage, Conversation } from "@/lib/types";

export interface ChatPartner { display_name: string; avatar: Avatar }

/** 1:1 대화. 마을과 상관없이 내가 나눈 모든 대화를 모아 보고, 신청·수락 상태와 읽지 않은 메시지를 실시간으로 따라간다. */
export function useChat(userId: string, onIncoming: (c: Conversation) => void) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [partners, setPartners] = useState<Record<string, ChatPartner>>({});
  const [loaded, setLoaded] = useState(false);
  const seen = useRef(new Map<string, string | null>());
  const first = useRef(true);
  const incoming = useRef(onIncoming);
  useEffect(() => {
    incoming.current = onIncoming;
  }, [onIncoming]);

  const load = useCallback(async () => {
    const { data } = await supabase().from("conversations").select("*").order("updated_at", { ascending: false });
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
    // 다른 마을 사람과의 대화도 이름·모습이 보이게, 대화 상대의 프로필을 따로 읽는다(함께 사는 마을이 있으면 읽힌다)
    const ids = [...new Set(list.map((c) => (c.user_a === userId ? c.user_b : c.user_a)))];
    if (ids.length) {
      const { data: ps } = await supabase().from("profiles").select("id, display_name, avatar").in("id", ids);
      if (ps) setPartners(Object.fromEntries((ps as { id: string; display_name: string; avatar: Avatar }[]).map((p) => [p.id, { display_name: p.display_name, avatar: p.avatar }])));
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`chat:${userId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => void load())
      .subscribe();
    const poll = visibleInterval(() => void load(), 30_000);
    return () => {
      stopPoll(poll);
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
  return { convs, partners, loaded, reload: load, unreadOf, pendingIncoming, badge };
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
    const poll = visibleInterval(() => void load(), 20_000);
    return () => {
      stopPoll(poll);
      void sb.removeChannel(channel);
    };
  }, [convId, enabled, load]);

  return { messages: convId ? messages : [], reload: load };
}
