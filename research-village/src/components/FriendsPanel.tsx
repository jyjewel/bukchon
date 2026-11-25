"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Avatar } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Notice } from "./ui";

interface Friend { user_id: string; display_name: string; field: string; bio: string; avatar: Avatar; since: string }
const linkOf = (code: string) => `${window.location.origin}${window.location.pathname}?friend=${code}`;

/** 설정의 "친구": 내 친구 링크(복사·QR)와 친구 목록 */
export default function FriendsPanel() {
  const [code, setCode] = useState("");
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const qr = useRef<HTMLCanvasElement>(null);

  const load = useCallback(async () => {
    const [c, f] = await Promise.all([supabase().rpc("my_friend_code"), supabase().rpc("list_friends")]);
    if (c.error) setErr(errorMessage(c.error)); else setCode(c.data as string);
    if (!f.error) setFriends((f.data ?? []) as Friend[]);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
  }, [load]);
  useEffect(() => {
    if (code && qr.current) void QRCode.toCanvas(qr.current, linkOf(code), { width: 144, margin: 1, color: { dark: "#3a2a33", light: "#ffffff" } });
  }, [code]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(linkOf(code)); setMsg("친구 링크를 복사했어요. 친구에게 보내 보세요."); }
    catch { setMsg("복사가 안 돼요. 아래 링크를 길게 눌러 직접 복사해 주세요."); }
  };
  const renew = async () => {
    if (!window.confirm("새 링크로 바꾸면 이전 링크는 더 이상 쓸 수 없어요. 이미 친구가 된 사람은 그대로예요. 바꿀까요?")) return;
    setBusy(true);
    const { data, error } = await supabase().rpc("renew_friend_code");
    setBusy(false);
    if (error) setErr(errorMessage(error)); else { setCode(data as string); setMsg("새 링크로 바꿨어요."); }
  };
  const remove = async (f: Friend) => {
    if (!window.confirm(`${f.display_name}님을 친구에서 삭제할까요? 상대 목록에서도 사라져요.`)) return;
    const { error } = await supabase().rpc("remove_friend", { p_friend: f.user_id });
    if (error) setErr(errorMessage(error)); else setFriends((l) => (l ?? []).filter((x) => x.user_id !== f.user_id));
  };

  return (
    <div className="space-y-3 p-3">
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="ok">{msg}</Notice>}
      <p className="text-sm text-ink-soft">이 링크(또는 QR)를 받은 사람이 열어서 “친구 추가”를 누르면, 마을이 달라도 서로 친구가 돼요.</p>
      {code && (
        <div className="flex flex-wrap items-center gap-3">
          <canvas ref={qr} className="rounded border border-line" width={144} height={144} style={{ width: 144, height: 144 }} aria-label="친구 링크 QR 코드" />
          <div className="min-w-0 flex-1 space-y-2">
            <input className="input" readOnly value={linkOf(code)} onFocus={(e) => e.currentTarget.select()} aria-label="내 친구 링크" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-mint btn-sm" onClick={copy}>링크 복사</button>
              <button type="button" className="btn btn-sm" disabled={busy} onClick={renew}>새 링크로 바꾸기</button>
            </div>
          </div>
        </div>
      )}
      <div className="dotted pt-3">
        <p className="mb-2 font-display text-sm">내 친구 {friends ? `(${friends.length})` : ""}</p>
        {friends && friends.length === 0 && <p className="text-sm text-ink-soft">아직 친구가 없어요. 위 링크를 보내 보세요.</p>}
        <ul className="space-y-1">
          {(friends ?? []).map((f) => (
            <li key={f.user_id} className="card flex items-center gap-3 px-2 py-1.5">
              <CharacterIcon avatar={f.avatar} size={44} headOnly />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm">{f.display_name}</p>
                {f.field && <p className="truncate text-xs text-ink-soft">{f.field}</p>}
                {f.bio && <p className="truncate text-xs text-ink-soft">{f.bio}</p>}
              </div>
              <button type="button" className="btn btn-sm" onClick={() => void remove(f)}>삭제</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
