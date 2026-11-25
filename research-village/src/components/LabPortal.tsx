"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { portalGrid } from "@/pixel/portal";
import type { VillageInfo } from "@/lib/types";
import PixelArt from "./PixelArt";
import { Modal } from "./ui";

interface Person { user_id: string; name: string }
interface FriendRow { user_id: string; display_name: string }

/** 연구실 벽의 포탈을 누르면 뜨는 창: 내가 사는 모든 마을의 주민 연구실로 바로 건너간다(다른 마을이면 마을도 함께 옮긴다) */
export default function PortalDialog({ villages, currentVillageId, myId, currentId, onGo, onClose }: { villages: VillageInfo[]; currentVillageId: string; myId: string; currentId: string; onGo: (userId: string, villageId: string) => void; onClose: () => void }) {
  const art = useMemo(() => portalGrid(), []);
  const [byVillage, setByVillage] = useState<Record<string, Person[]> | null>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  useEffect(() => {
    let alive = true;
    const sb = supabase();
    void (async () => {
      const ids = villages.map((v) => v.id);
      const m = await sb.from("village_members").select("village_id, user_id").in("village_id", ids);
      const uids = [...new Set((m.data ?? []).map((r) => r.user_id as string))];
      const p = uids.length ? await sb.from("profiles").select("id, display_name").in("id", uids) : { data: [] as { id: string; display_name: string }[] };
      const name = new Map((p.data ?? []).map((x) => [x.id as string, x.display_name as string]));
      const out: Record<string, Person[]> = {};
      for (const r of (m.data ?? []) as { village_id: string; user_id: string }[]) (out[r.village_id] ??= []).push({ user_id: r.user_id, name: name.get(r.user_id) ?? "이웃" });
      if (alive) setByVillage(out);
      const f = await sb.rpc("list_friends");
      if (alive && !f.error) setFriends((f.data ?? []) as FriendRow[]);
    })();
    return () => { alive = false; };
  }, [villages]);

  // 친구 목록처럼 마을 구분 없이 한 줄로: 같은 사람이 여러 마을에 있어도 한 번만, 건너갈 때는 지금 마을을 먼저 따져서 가능하면 마을을 옮기지 않는다.
  const ordered = [...villages].sort((a, b) => (a.id === currentVillageId ? -1 : b.id === currentVillageId ? 1 : 0));
  const people = new Map<string, { user_id: string; name: string; villageId: string }>();
  for (const v of ordered) for (const x of byVillage?.[v.id] ?? []) if (x.user_id !== currentId && !people.has(x.user_id)) people.set(x.user_id, { ...x, villageId: v.id });
  const list = [...people.values()].sort((a, b) => (a.user_id === myId ? -1 : b.user_id === myId ? 1 : a.name.localeCompare(b.name, "ko")));

  const friendList = friends.filter((f) => !people.has(f.user_id) && f.user_id !== currentId);
  const removeFriend = async (f: FriendRow) => {
    if (!window.confirm(`${f.display_name}님을 친구에서 삭제할까요? 상대 쪽에서도 사라져요.`)) return;
    const { error } = await supabase().rpc("remove_friend", { p_friend: f.user_id });
    if (!error) setFriends((l) => l.filter((x) => x.user_id !== f.user_id));
  };
  return (
    <Modal title="포탈" tone="lilac" onClose={onClose}>
      <div className="flex items-start gap-3">
        <PixelArt art={art} scale={4} sparkle label="포탈 도트 그림" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-ink-soft">어느 연구실로 건너갈까요?</p>
          {byVillage === null && <p className="text-sm text-ink-soft">포탈이 열리는 중…</p>}
          {byVillage && list.length === 0 && friendList.length === 0 && <p className="text-sm text-ink-soft">건너갈 연구실이 아직 없어요.</p>}
          {friendList.length > 0 && (
            <div className="space-y-1">
              <p className="label">친구의 연구실 (구경하고 포스트잇을 남길 수 있어요)</p>
              <ul className="flex flex-wrap gap-1" aria-label="친구 연구실">
                {friendList.map((f) => (
                  <li key={f.user_id} className="flex">
                    <button type="button" className="btn btn-sm btn-mint" onClick={() => { onClose(); onGo(f.user_id, "friend"); }} aria-label={`${f.display_name} 친구의 연구실로 이동`}>{f.display_name}</button>
                    <button type="button" className="btn btn-sm" onClick={() => void removeFriend(f)} aria-label={`${f.display_name} 친구 삭제`} title="친구 삭제">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {list.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="이동할 연구실">
              {list.map((r) => (
                <li key={r.user_id}>
                  <button type="button" className="btn btn-sm" onClick={() => { onClose(); onGo(r.user_id, r.villageId); }} aria-label={`${r.user_id === myId ? "내" : `${r.name}의`} 연구실로 이동`}>
                    {r.user_id === myId ? "내 연구실" : r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
