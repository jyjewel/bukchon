"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { portalGrid } from "@/pixel/portal";
import type { VillageInfo } from "@/lib/types";
import PixelArt from "./PixelArt";
import { Modal } from "./ui";

interface Person { user_id: string; name: string }

/** 연구실 벽의 포탈을 누르면 뜨는 창: 내가 사는 모든 마을의 주민 연구실로 바로 건너간다(다른 마을이면 마을도 함께 옮긴다) */
export default function PortalDialog({ villages, currentVillageId, myId, currentId, onGo, onClose }: { villages: VillageInfo[]; currentVillageId: string; myId: string; currentId: string; onGo: (userId: string, villageId: string) => void; onClose: () => void }) {
  const art = useMemo(() => portalGrid(), []);
  const [byVillage, setByVillage] = useState<Record<string, Person[]> | null>(null);
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
    })();
    return () => { alive = false; };
  }, [villages]);

  // 현재 마을을 맨 앞에. 같은 사람이 여러 마을에 있어도 처음 나온 마을 한 곳에만 보여 준다.
  const ordered = [...villages].sort((a, b) => (a.id === currentVillageId ? -1 : b.id === currentVillageId ? 1 : 0));
  const seen = new Set<string>([currentId]);
  const groups = ordered.map((v) => {
    const people = (byVillage?.[v.id] ?? []).filter((x) => { if (seen.has(x.user_id)) return false; seen.add(x.user_id); return true; })
      .sort((a, b) => (a.user_id === myId ? -1 : b.user_id === myId ? 1 : a.name.localeCompare(b.name, "ko")));
    return { v, people };
  }).filter((g) => g.people.length > 0);

  return (
    <Modal title="포탈" tone="lilac" onClose={onClose}>
      <div className="flex items-start gap-3">
        <PixelArt art={art} scale={4} sparkle label="포탈 도트 그림" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-ink-soft">어느 연구실로 건너갈까요? 내가 사는 모든 마을의 주민에게 갈 수 있어요.</p>
          {byVillage === null && <p className="text-sm text-ink-soft">포탈이 열리는 중…</p>}
          {byVillage && groups.length === 0 && <p className="text-sm text-ink-soft">건너갈 연구실이 아직 없어요.</p>}
          {groups.map(({ v, people }) => (
            <section key={v.id} aria-label={`${v.name} 주민`} className="space-y-1">
              {villages.length > 1 && <h3 className="label">{v.name}{v.id === currentVillageId ? " (지금 마을)" : ""}</h3>}
              <ul className="flex flex-wrap gap-1" aria-label={`${v.name}에서 이동할 연구실`}>
                {people.map((r) => (
                  <li key={r.user_id}>
                    <button type="button" className="btn btn-sm" onClick={() => { onClose(); onGo(r.user_id, v.id); }} aria-label={`${r.user_id === myId ? "내" : `${r.name}의`} 연구실로 이동`}>
                      {r.user_id === myId ? "내 연구실" : r.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
