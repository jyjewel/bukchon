"use client";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, supabase } from "@/lib/supabase";
import { DEFAULT_ROOFS, ROOFS, VILLAGE_CAPACITY, WALLS } from "@/lib/constants";
import type { Profile, Resident, Village } from "@/lib/types";
import ProfileForm from "./ProfileForm";
import { Notice, Swatches, Window } from "./ui";

function inviteUrl(code: string) {
  return `${window.location.origin}${window.location.pathname}?invite=${code}`;
}

function AdminPanel({ village, residents, myId, reload }: { village: Village; residents: Resident[]; myId: string; reload: () => Promise<void> }) {
  const [name, setName] = useState(village.name);
  const [invite, setInvite] = useState<{ code: string; expires_at: string; expired: boolean } | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadInvite = useCallback(async () => {
    const { data } = await supabase().from("village_invites").select("code, expires_at").eq("village_id", village.id).maybeSingle();
    setInvite(data ? { ...data, expired: new Date(data.expires_at).getTime() < Date.now() } : null);
  }, [village.id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 현재 초대 링크를 불러온다
    void loadInvite();
  }, [loadInvite]);

  const act = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    setMsg(error ? { kind: "error", text: errorMessage(error) } : { kind: "ok", text: ok });
    await Promise.all([loadInvite(), reload()]);
  };
  const expired = invite?.expired ?? false;
  const copy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.code));
      setMsg({ kind: "ok", text: "초대 링크를 복사했어요." });
    } catch {
      setMsg({ kind: "error", text: "복사하지 못했어요. 링크를 직접 선택해 복사해 주세요." });
    }
  };

  return (
    <Window title="마을 관리" icon="" tone="butter">
      <div className="space-y-4 p-3">
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void act(() => supabase().from("villages").update({ name: name.trim() }).eq("id", village.id), "마을 이름을 바꿨어요."); }}>
          <div className="flex-1">
            <label className="label" htmlFor="adm-name">마을 이름</label>
            <input id="adm-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required />
          </div>
          <button type="submit" className="btn" disabled={busy || !name.trim() || name.trim() === village.name}>바꾸기</button>
        </form>

        <section className="dotted pt-3">
          <h3 className="label">초대 링크 <span className="text-ink-soft">(주민 {residents.length}/{VILLAGE_CAPACITY}명)</span></h3>
          {invite ? (
            <div className="space-y-2">
              <input className="input text-xs" readOnly value={inviteUrl(invite.code)} aria-label="초대 링크" onFocus={(e) => e.target.select()} />
              <p className="text-xs text-ink-soft">
                {expired ? "! 만료된 링크예요. 새로 발급해 주세요." : `${new Date(invite.expires_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}까지 쓸 수 있어요.`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">지금은 쓸 수 있는 초대 링크가 없어요.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {invite && !expired && <button type="button" className="btn btn-mint btn-sm" onClick={copy}>링크 복사</button>}
            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => act(() => supabase().rpc("create_invite", { p_village: village.id }), invite ? "새 링크를 발급했어요. 이전 링크는 더 이상 쓸 수 없어요." : "초대 링크를 만들었어요.")}>
              {invite ? "새로 발급" : "초대 링크 만들기"}
            </button>
            {invite && <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => act(() => supabase().rpc("revoke_invite", { p_village: village.id }), "초대 링크를 없앴어요.")}>링크 없애기</button>}
          </div>
        </section>

        <section className="dotted pt-3">
          <h3 className="label">주민</h3>
          <ul className="space-y-1">
            {residents.map((r) => (
              <li key={r.user_id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{r.slot + 1}번 집 · {r.profile.display_name}{r.role === "admin" && " "}</span>
                {r.user_id !== myId && (
                  <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => {
                    if (window.confirm(`${r.profile.display_name} 님을 마을에서 내보낼까요? 이 마을에 남긴 다이어리도 함께 지워져요.`)) {
                      void act(() => supabase().rpc("remove_member", { p_village: village.id, p_user: r.user_id }), "주민을 내보냈어요.");
                    }
                  }}>내보내기</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Window>
  );
}

export default function SettingsView({
  profile, me, village, residents, reloadProfile, reloadVillage,
}: { profile: Profile; me: Resident; village: Village; residents: Resident[]; reloadProfile: () => Promise<void>; reloadVillage: () => Promise<void> }) {
  const [error, setError] = useState("");
  const roof = me.house.style.roof ?? DEFAULT_ROOFS[me.slot];
  const wall = me.house.style.wall ?? WALLS[0];

  const setStyle = async (patch: { roof?: string; wall?: string }) => {
    const { error } = await supabase().from("houses").update({ style: { ...me.house.style, ...patch } }).eq("village_id", village.id).eq("slot", me.slot);
    if (error) setError(errorMessage(error));
    await reloadVillage();
  };
  const toggleShare = async (share: boolean) => {
    const { error } = await supabase().from("profiles").update({ share_study_time: share }).eq("id", profile.id);
    if (error) setError(errorMessage(error));
    await reloadProfile();
    await reloadVillage();
  };
  const exportData = async () => {
    const sb = supabase();
    const [sessions, notes, diary, board, postits, shelf] = await Promise.all([
      sb.from("study_sessions").select("*").eq("user_id", profile.id).order("started_at"),
      sb.from("study_notes").select("*").eq("user_id", profile.id).maybeSingle(),
      sb.from("diary_entries").select("*").eq("author_id", profile.id).order("created_at"),
      sb.from("whiteboard_items").select("*").eq("owner_id", profile.id).order("created_at"),
      sb.from("postits").select("*").eq("author_id", profile.id).order("created_at"),
      sb.from("achievements").select("*").eq("owner_id", profile.id).order("created_at"),
    ]);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), profile, research_status: me.status, house: me.house, study_sessions: sessions.data, study_notes: notes.data, diary_entries: diary.data, whiteboard_items: board.data, postits_written: postits.data, achievements: shelf.data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "research-village-my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const leave = async () => {
    if (!window.confirm("정말 이 마을을 떠날까요? 이 마을에 남긴 다이어리가 지워지고 집이 비게 돼요.")) return;
    const { error } = await supabase().rpc("leave_village", { p_village: village.id });
    if (error) return setError(errorMessage(error));
    await reloadVillage();
  };
  const deleteAccount = async () => {
    if (window.prompt("계정과 모든 기록(다이어리·연구 시간·노트)이 영구히 지워져요. 계속하려면 ‘삭제’라고 입력해 주세요.") !== "삭제") return;
    const { error } = await supabase().rpc("delete_account");
    if (error) return setError(errorMessage(error));
    await supabase().auth.signOut({ scope: "local" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}
        <Window title="내 프로필과 캐릭터" icon="" tone="lilac">
          <div className="p-3">
            <ProfileForm profile={profile} submitLabel="저장" onSaved={async () => { await reloadProfile(); await reloadVillage(); }} />
          </div>
        </Window>
      </div>
      <div className="space-y-4">
        <Window title="집 꾸미기" icon="" tone="mint">
          <div className="space-y-3 p-3">
            <Swatches label="지붕 색" options={ROOFS} value={roof} onChange={(c) => void setStyle({ roof: c })} />
            <Swatches label="벽 색" options={WALLS} value={wall} onChange={(c) => void setStyle({ wall: c })} />
            <p className="text-xs text-ink-soft">고르면 바로 마을 지도에 반영돼요.</p>
          </div>
        </Window>
        <Window title="공개 설정" icon="" tone="sky">
          <div className="space-y-2 p-3 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={profile.share_study_time} onChange={(e) => void toggleShare(e.target.checked)} />
              <span>오늘의 연구 시간을 마을 주민에게 보여 주기<br /><span className="text-xs text-ink-soft">끄면 연구 시간은 나만 볼 수 있어요. 켜도 순위는 매기지 않아요.</span></span>
            </label>
          </div>
        </Window>
        {me.role === "admin" && <AdminPanel village={village} residents={residents} myId={me.user_id} reload={reloadVillage} />}
        <Window title="내 데이터와 계정" icon="" tone="rose">
          <div className="space-y-3 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => void exportData()}>내 데이터 내려받기</button>
              <button type="button" className="btn" onClick={() => supabase().auth.signOut()}>로그아웃</button>
            </div>
            <div className="dotted flex flex-wrap gap-2 pt-3">
              <button type="button" className="btn btn-danger" onClick={() => void leave()}>마을 떠나기</button>
              <button type="button" className="btn btn-danger" onClick={() => void deleteAccount()}>계정 삭제</button>
            </div>
          </div>
        </Window>
      </div>
    </div>
  );
}
