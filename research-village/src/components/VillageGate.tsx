"use client";
import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { VILLAGE_CAPACITY } from "@/lib/constants";
import { Notice, Window } from "./ui";

/** 초대장으로 입주하거나 새 마을을 만든다. (이미 마을이 있는 사람은 onCancel 로 돌아갈 수 있다. 마을은 최대 5개.) */
export default function VillageGate({ inviteCode, onClearInvite, onDone, onCancel }: { inviteCode: string; onClearInvite: () => void; onDone: (villageId: string) => void; onCancel?: () => void }) {
  const [code, setCode] = useState(inviteCode);
  const [preview, setPreview] = useState<{ village_name: string; member_count: number; valid: boolean } | null | "none">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inviteCode) return;
    let cancelled = false;
    supabase().rpc("preview_invite", { p_code: inviteCode }).then(({ data }) => {
      if (!cancelled) setPreview(data?.[0] ?? "none");
    });
    return () => { cancelled = true; };
  }, [inviteCode]);

  const run = async (fn: "join_village" | "create_village", args: Record<string, string>) => {
    setBusy(true);
    setError("");
    const { data, error } = await supabase().rpc(fn, args);
    setBusy(false);
    if (error) setError(errorMessage(error));
    else onDone(data as string);
  };
  const join = (e: FormEvent) => {
    e.preventDefault();
    // 초대 링크 전체를 붙여 넣어도 코드만 뽑아낸다
    const c = code.trim().match(/invite=([A-Za-z0-9]+)/)?.[1] ?? code.trim();
    void run("join_village", { p_code: c });
  };
  const create = (e: FormEvent) => {
    e.preventDefault();
    void run("create_village", { p_name: name.trim() });
  };
  const full = preview && preview !== "none" && preview.member_count >= VILLAGE_CAPACITY;

  return (
    <>
      {error && <Notice kind="error">{error}</Notice>}
      <Window title="초대장으로 입주하기" icon="" tone="mint">
        <form onSubmit={join} className="space-y-3 p-4">
          {inviteCode && preview === "none" && <Notice kind="error">이 초대 링크는 더 이상 쓸 수 없어요. 마을 관리자에게 새 링크를 부탁해 보세요.</Notice>}
          {inviteCode && preview && preview !== "none" && (
            <Notice kind={preview.valid && !full ? "ok" : "error"}>
              <strong className="font-display">{preview.village_name}</strong>에서 초대장이 왔어요. (주민 {preview.member_count}/{VILLAGE_CAPACITY}명)
              {!preview.valid && " 다만 초대 링크가 만료되었어요."}
              {preview.valid && full && " 다만 빈 집이 없어요."}
            </Notice>
          )}
          <div>
            <label className="label" htmlFor="gate-code">초대 코드 또는 초대 링크</label>
            <input id="gate-code" className="input" value={code} onChange={(e) => { setCode(e.target.value); if (inviteCode) onClearInvite(); }} required />
          </div>
          <button type="submit" className="btn btn-mint" disabled={busy || !code.trim()}>입주하기</button>
        </form>
      </Window>
      <Window title="새 마을 만들기" icon="" tone="butter">
        <form onSubmit={create} className="space-y-3 p-4">
          <p className="text-sm text-ink-soft">집 6채와 도서관, 광장이 있는 비공개 마을이 생겨요. 만든 사람이 관리자가 되어 초대 링크를 보낼 수 있어요.</p>
          <div>
            <label className="label" htmlFor="gate-name">마을 이름</label>
            <input id="gate-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="예: 북촌 서당" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>마을 만들기</button>
        </form>
      </Window>
      <p className="text-center">
        {onCancel
          ? <button type="button" className="btn" onClick={onCancel}>◀ 돌아가기</button>
          : <button type="button" className="text-sm text-ink-soft underline" onClick={() => supabase().auth.signOut()}>로그아웃</button>}
      </p>
    </>
  );
}
