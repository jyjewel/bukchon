"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import type { useChat } from "@/hooks/useChat";
import { useMessages } from "@/hooks/useChat";
import type { Conversation, Resident } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Notice, Window } from "./ui";

type Chat = ReturnType<typeof useChat>;

const STATUS_TEXT: Record<Conversation["status"], string> = { pending: "신청 중", active: "대화 중", declined: "거절됨", ended: "끝남" };

/** 1:1 실시간 대화. 집 앞 책상에 나와 있는 주민에게 신청하고, 수락하면 바로 이야기할 수 있다. */
export default function ChatView({
  chat, residents, myId, selectedId, onSelect,
}: { chat: Chat; residents: Resident[]; myId: string; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const who = (c: Conversation) => residents.find((r) => r.user_id === (c.user_a === myId ? c.user_b : c.user_a));
  const selected = chat.convs.find((c) => c.id === selectedId) ?? null;
  const { convs } = chat;
  const live = convs.filter((c) => c.status === "pending" || c.status === "active");
  const past = convs.filter((c) => c.status === "declined" || c.status === "ended").slice(0, 8);

  const row = (c: Conversation) => {
    const other = who(c);
    return (
      <li key={c.id}>
        <button type="button" onClick={() => onSelect(c.id)} className={`card flex w-[calc(100%-6px)] items-center gap-2 p-2 text-left text-sm ${selectedId === c.id ? "card-on" : ""}`}>
          {other && <CharacterIcon avatar={other.profile.avatar} size={38} />}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display">{other?.profile.display_name ?? "떠난 주민"}</span>
            <span className="text-xs text-ink-soft">{c.status === "pending" && c.user_b === myId ? "대화를 신청했어요" : STATUS_TEXT[c.status]}</span>
          </span>
          {(chat.unreadOf(c) || (c.status === "pending" && c.user_b === myId)) && <span className="chip" style={{ background: "#d9547a", color: "#fff" }}>새</span>}
        </button>
      </li>
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Window title="대화" tone="mint" className="self-start">
        <ul className="p-2">
          {live.length === 0 && <li className="p-3 text-sm text-ink-soft">진행 중인 대화가 없어요. 집 앞 책상에 나와 있는 주민에게 대화를 신청해 보세요.</li>}
          {live.map(row)}
          {past.length > 0 && <li className="px-2 pt-2 text-xs text-ink-soft">지난 대화</li>}
          {past.map(row)}
        </ul>
      </Window>
      {selected ? (
        <Room key={selected.id} conv={selected} other={who(selected)} myId={myId} chat={chat} />
      ) : (
        <Window title="대화" tone="sky"><p className="p-6 text-center text-sm text-ink-soft">왼쪽에서 대화를 고르거나, 마을에서 ‘열린 연구’ 중인 주민에게 대화를 신청해 보세요.</p></Window>
      )}
    </div>
  );
}

function Room({ conv, other, myId, chat }: { conv: Conversation; other?: Resident; myId: string; chat: Chat }) {
  const { messages } = useMessages(conv.id, conv.status === "active" || conv.status === "ended");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const name = other?.profile.display_name ?? "떠난 주민";
  const incomingRequest = conv.status === "pending" && conv.user_b === myId;
  const lastId = messages[messages.length - 1]?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);
  useEffect(() => {
    if (conv.status !== "active") return;
    void supabase().rpc("mark_chat_read", { p_conv: conv.id }).then(() => chat.reload());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 메시지가 새로 올 때만 읽음 처리
  }, [conv.id, conv.status, lastId]);

  const rpc = async (fn: "respond_chat" | "end_chat", args: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await supabase().rpc(fn, args);
    setBusy(false);
    setError(error ? errorMessage(error) : "");
    await chat.reload();
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await supabase().from("messages").insert({ conversation_id: conv.id, sender_id: myId, body });
    if (error) {
      setText(body);
      setError(errorMessage(error));
    } else setError("");
  };

  return (
    <Window title={`${name}님과의 대화`} tone="sky" actions={conv.status === "active" ? <button type="button" className="btn btn-sm" disabled={busy} onClick={() => window.confirm("대화를 끝낼까요?") && void rpc("end_chat", { p_conv: conv.id })}>대화 끝내기</button> : undefined}>
      <div className="flex min-h-[320px] flex-col">
        {error && <div className="p-2"><Notice kind="error">{error}</Notice></div>}
        {incomingRequest && (
          <div className="space-y-2 p-4 text-center">
            <p><span className="font-display">{name}</span>님이 대화를 신청했어요.</p>
            <div className="flex justify-center gap-2">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void rpc("respond_chat", { p_conv: conv.id, p_accept: true })}>수락</button>
              <button type="button" className="btn" disabled={busy} onClick={() => void rpc("respond_chat", { p_conv: conv.id, p_accept: false })}>거절</button>
            </div>
          </div>
        )}
        {conv.status === "pending" && !incomingRequest && <p className="p-6 text-center text-sm text-ink-soft">{name}님이 수락하면 대화를 시작할 수 있어요. 잠시만 기다려 주세요.</p>}
        {conv.status === "declined" && <p className="p-6 text-center text-sm text-ink-soft">{conv.user_a === myId ? `${name}님이 지금은 대화하기 어렵대요.` : "대화를 거절했어요."}</p>}
        {(conv.status === "active" || conv.status === "ended") && (
          <>
            <ul className="max-h-[420px] min-h-[240px] flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite" aria-label="대화 내용">
              {messages.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">{conv.status === "active" ? "인사를 건네 보세요!" : "주고받은 말이 없어요."}</li>}
              {messages.map((m) => {
                const mine = m.sender_id === myId;
                return (
                  <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%]">
                      <p className="px-box whitespace-pre-wrap break-words px-2 py-1 text-sm" style={{ background: mine ? "#ffc9d6" : "#fffdf6", ["--px" as string]: "2px" }}>{m.body}</p>
                      <p className={`text-xs text-ink-soft ${mine ? "text-right" : ""}`}>{relativeTime(m.created_at)}</p>
                    </div>
                  </li>
                );
              })}
              <div ref={endRef} />
            </ul>
            {conv.status === "active" ? (
              <form onSubmit={send} className="flex items-start gap-1 border-t-[3px] border-ink p-2">
                <label className="sr-only" htmlFor="chat-input">메시지</label>
                <input id="chat-input" className="input" autoComplete="off" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={`${name}님에게 보낼 말`} />
                <button type="submit" className="btn btn-primary mt-[3px]" disabled={!text.trim()}>보내기</button>
              </form>
            ) : <p className="border-t-[3px] border-ink p-3 text-center text-sm text-ink-soft">대화가 끝났어요. 상대가 열린 연구 중이면 다시 신청할 수 있어요.</p>}
          </>
        )}
      </div>
    </Window>
  );
}
