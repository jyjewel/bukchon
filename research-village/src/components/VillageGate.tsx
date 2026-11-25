"use client";
import { detachPush } from "@/lib/push";
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
  const [created, setCreated] = useState<{ id: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

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
    if (error) { setBusy(false); setError(errorMessage(error)); return; }
    if (fn === "create_village") {
      // 마을을 만들었으면 곧바로 초대 링크를 보여 줘서 동료를 부를 수 있게 한다
      const inv = await supabase().rpc("create_invite", { p_village: data as string });
      setBusy(false);
      if (!inv.error && typeof inv.data === "string") { setCreated({ id: data as string, link: `${window.location.origin}${window.location.pathname}?invite=${inv.data}` }); return; }
    }
    setBusy(false);
    onDone(data as string);
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
  const copyLink = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.link); setCopied(true); } catch { setError("복사가 안 돼요. 링크를 길게 눌러 직접 복사해 주세요."); }
  };
  const full = preview && preview !== "none" && preview.member_count >= VILLAGE_CAPACITY;

  return (
    <>
      {error && <Notice kind="error">{error}</Notice>}
      {created ? (
        <Window title="마을이 만들어졌어요! 🎉" icon="" tone="mint">
          <div className="space-y-3 p-4">
            <p className="text-sm">함께할 동료에게 이 초대 링크를 보내 보세요. 링크로 들어오면 바로 같은 마을에서 살게 돼요.</p>
            <input className="input" readOnly value={created.link} onFocus={(e) => e.currentTarget.select()} aria-label="초대 링크" />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-mint" onClick={copyLink}>{copied ? "복사했어요 ✓" : "링크 복사"}</button>
              <button type="button" className="btn btn-primary" onClick={() => onDone(created.id)}>마을로 들어가기</button>
            </div>
            <p className="text-xs text-ink-soft">링크는 나중에 설정의 관리자 메뉴에서도 다시 만들 수 있어요.</p>
          </div>
        </Window>
      ) : (<>
      {!onCancel && !inviteCode && (
        <Window title="연구자 마을에 오신 걸 환영해요" icon="" tone="sky">
          <div className="space-y-2 p-4">
            <p className="font-display text-lg">혼자 있어도 함께 있는 연구실</p>
            <p className="text-sm text-ink-soft">오늘의 일지, 마감, 할 일 정리를 한곳에서. 컴퓨터와 폰 앱 모두에서 쓸 수 있어요.</p>
            <ol className="space-y-1 text-sm">
              <li>① 아래에서 <b>마을 이름</b>을 정해 마을을 만들어요.</li>
              <li>② 만들어진 <b>초대 링크</b>를 함께할 동료에게 보내요.</li>
              <li>③ 같은 마을에서 서로의 연구실을 오가며 응원해요.</li>
            </ol>
            <p className="text-xs text-ink-soft">초대 링크를 받았다면 아래 "초대장으로 입주하기"에 붙여 넣으세요.</p>
          </div>
        </Window>
      )}
      <div className={inviteCode || onCancel ? "order-1" : "order-2"}>
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
      </div>
      <div className={inviteCode || onCancel ? "order-2" : "order-1"}>
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
      </div>
      </>)}
      <p className="order-3 text-center">
        {onCancel
          ? <button type="button" className="btn" onClick={onCancel}>◀ 돌아가기</button>
          : <button type="button" className="text-sm text-ink-soft underline" onClick={async () => { await detachPush(); await supabase().auth.signOut(); }}>로그아웃</button>}
      </p>
    </>
  );
}
