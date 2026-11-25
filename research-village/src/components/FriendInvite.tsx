"use client";
import { useEffect, useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Avatar } from "@/lib/types";
import { CharacterIcon } from "./Character";
import { Notice, Window } from "./ui";

interface Preview { display_name: string; field: string; avatar: Avatar; is_self: boolean; already: boolean }

/** 친구 링크(?friend=코드)를 열었을 때: 누구의 링크인지 보여 주고 친구로 추가할지 묻는다 */
export default function FriendInvite({ code, onDone }: { code: string; onDone: () => void }) {
  const [preview, setPreview] = useState<Preview | null | "none">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.resolve(supabase().rpc("preview_friend", { p_code: code })).then(({ data }) => { if (alive) setPreview((data as Preview | null) ?? "none"); });
    return () => { alive = false; };
  }, [code]);

  const add = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabase().rpc("add_friend", { p_code: code });
    setBusy(false);
    if (error) setError(error.message.includes("friend_limit") ? "친구는 200명까지 추가할 수 있어요." : errorMessage(error));
    else setAdded(true);
  };

  return (
    <Window title="친구 링크" icon="" tone="mint">
      <div className="space-y-3 p-4">
        {error && <Notice kind="error">{error}</Notice>}
        {preview === null && <p className="text-sm text-ink-soft" role="status">링크를 확인하는 중…</p>}
        {preview === "none" && <Notice kind="error">이 친구 링크는 더 이상 쓸 수 없어요. 상대에게 새 링크를 부탁해 보세요.</Notice>}
        {preview && preview !== "none" && (
          <>
            <div className="flex items-center gap-3">
              <CharacterIcon avatar={preview.avatar} size={50} headOnly />
              <div className="min-w-0">
                <p className="font-display text-lg">{preview.display_name}</p>
                {preview.field && <p className="truncate text-sm text-ink-soft">{preview.field}</p>}
              </div>
            </div>
            {preview.is_self ? <Notice kind="ok">내 친구 링크예요. 다른 사람에게 보내 보세요.</Notice>
              : added || preview.already ? <Notice kind="ok">{preview.display_name}님과 친구예요! 설정의 “친구”에서 볼 수 있어요.</Notice>
              : <p className="text-sm">{preview.display_name}님을 친구로 추가할까요? 서로 친구 목록에 올라가요.</p>}
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {preview && preview !== "none" && !preview.is_self && !preview.already && !added && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={add}>친구 추가</button>
          )}
          <button type="button" className="btn" onClick={onDone}>{added || (preview && preview !== "none" && (preview.already || preview.is_self)) || preview === "none" ? "확인" : "다음에 할게요"}</button>
        </div>
      </div>
    </Window>
  );
}
