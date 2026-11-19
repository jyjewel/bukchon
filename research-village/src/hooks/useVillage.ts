"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { HEARTBEAT_MS, STALE_MS } from "@/lib/constants";
import { PROFILE_COLUMNS } from "./useAuth";
import type { House, Profile, ResearchState, Resident, StatusRow, Village, VillageInfo } from "@/lib/types";

const lastKey = (userId: string) => `rv.village.${userId}`;

interface Raw {
  village: Village;
  members: { user_id: string; role: "admin" | "member"; joined_at: string }[];
  houses: House[];
  profiles: Profile[];
}

/**
 * 내가 사는 마을(여러 곳일 수 있다)들 가운데 지금 머무는 마을의 주민·집·연구 상태를 불러오고 실시간으로 동기화한다.
 *  - 마지막으로 머문 마을을 기억해 두었다가 다음에 그 마을로 들어간다
 *  - research_status 변경은 Realtime 으로 즉시 반영
 *  - 25초마다 heartbeat 로 접속 중임을 서버에 알리고, 놓친 이벤트에 대비해 다시 읽는다
 */
export function useVillage(userId: string | null, accessToken: string | null) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<Raw | null>(null);
  const [villages, setVillages] = useState<VillageInfo[]>([]);
  const [prevSeen, setPrevSeen] = useState<Record<string, string>>({}); // 마을마다 이번에 들어오기 직전의 마지막 접속 시각
  const currentRef = useRef<string | null>(null);
  const orderRef = useRef<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, StatusRow>>({});
  const [skew, setSkew] = useState(0); // 서버 시각 - 내 시각 (ms)
  const [now, setNow] = useState(() => Date.now());
  const villageId = raw?.village.id ?? null;
  const tokenRef = useRef(accessToken);
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const applyServerTime = useCallback((iso: unknown) => {
    if (typeof iso === "string") setSkew(new Date(iso).getTime() - Date.now());
    setNow(Date.now());
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    const sb = supabase();
    const mine = await sb.from("village_members").select("village_id, role").eq("user_id", userId).order("joined_at");
    if (mine.error) return; // 일시적 오류: 기존 화면 유지
    const prefs = await sb.from("user_prefs").select("village_order").maybeSingle();
    if (!prefs.error) orderRef.current = (prefs.data?.village_order as string[] | undefined) ?? [];
    // 내가 정한 순서가 먼저, 나머지는 들어간 순서대로
    const byOrder = (a: string, b: string) => { const ia = orderRef.current.indexOf(a), ib = orderRef.current.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); };
    const joinedOrder = (mine.data ?? []).map((x) => x.village_id as string);
    const ids = [...joinedOrder].sort((a, b) => byOrder(a, b) || joinedOrder.indexOf(a) - joinedOrder.indexOf(b));
    if (!ids.length) {
      setRaw(null);
      setVillages([]);
      setStatuses({});
      setLoading(false);
      return;
    }
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(lastKey(userId));
    } catch {}
    const vid = [currentRef.current, stored].find((x): x is string => !!x && ids.includes(x)) ?? ids[0];
    currentRef.current = vid;
    const vs = await sb.from("villages").select("id, name, theme, library_style, gate_locked").in("id", ids);
    if (vs.error || !vs.data) return;
    setVillages(
      ids.flatMap((id) => {
        const info = vs.data!.find((y) => y.id === id);
        const m = mine.data!.find((y) => y.village_id === id);
        return info && m ? [{ id: info.id as string, name: info.name as string, role: m.role as "admin" | "member" }] : [];
      }),
    );
    const [m, h, s] = await Promise.all([
      sb.from("village_members").select("user_id, role, joined_at").eq("village_id", vid),
      sb.from("houses").select("village_id, slot, owner_id, style").eq("village_id", vid).order("slot"),
      sb.from("research_status").select("*").eq("village_id", vid),
    ]);
    const v = { data: vs.data.find((x) => x.id === vid) };
    if (!v.data || !m.data || !h.data || !s.data) return;
    const p = await sb.from("profiles").select(PROFILE_COLUMNS).in("id", m.data.map((x) => x.user_id));
    if (!p.data) return;
    setRaw({ village: v.data as Village, members: m.data as Raw["members"], houses: h.data as House[], profiles: p.data as Profile[] });
    setStatuses(Object.fromEntries((s.data as StatusRow[]).map((r) => [r.user_id, r])));
    const myRow = (s.data as StatusRow[]).find((r) => r.user_id === userId);
    if (myRow) setPrevSeen((p) => (p[vid] ? p : { ...p, [vid]: myRow.left_at && myRow.left_at > myRow.last_seen_at ? myRow.left_at : myRow.last_seen_at }));
    setLoading(false);
  }, [userId]);

  // 첫 로드
  useEffect(() => {
     
    void load();
  }, [load]);

  // 입장 처리 + heartbeat + 실시간 구독
  useEffect(() => {
    if (!villageId || !userId) return;
    const sb = supabase();
    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => void load(), 250);
    };

    sb.rpc("enter_village", { p_village: villageId }).then(({ data }) => {
      applyServerTime(data);
      void load();
    });

    const beat = async () => {
      const { data } = await sb.rpc("heartbeat", { p_village: villageId });
      applyServerTime(data);
      void load();
    };
    const interval = setInterval(beat, HEARTBEAT_MS);
    const tick = setInterval(() => setNow(Date.now()), 10_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVisible);

    // 탭을 닫으면 곧바로 오프라인으로 보이도록 서버에 알린다 (연구 상태 자체는 건드리지 않음).
    const onLeave = () => {
      if (!tokenRef.current) return;
      void fetch(`${SUPABASE_URL}/rest/v1/rpc/go_away`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ p_village: villageId }),
      }).catch(() => {});
    };
    window.addEventListener("pagehide", onLeave);

    const channel = sb
      .channel(`village:${villageId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "research_status", filter: `village_id=eq.${villageId}` }, (payload) => {
        if (payload.eventType === "DELETE") return scheduleReload();
        const row = payload.new as StatusRow;
        setStatuses((prev) => ({ ...prev, [row.user_id]: row }));
        setNow(Date.now());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "village_members" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "houses", filter: `village_id=eq.${villageId}` }, scheduleReload)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "villages" }, scheduleReload)
      .subscribe();

    return () => {
      clearInterval(interval);
      clearInterval(tick);
      clearTimeout(reloadTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onLeave);
      void sb.removeChannel(channel);
    };
  }, [villageId, userId, load, applyServerTime]);

  const residents = useMemo<Resident[]>(() => {
    if (!raw) return [];
    const serverNow = now + skew;
    const list: Resident[] = [];
    for (const m of raw.members) {
      const profile = raw.profiles.find((p) => p.id === m.user_id);
      const house = raw.houses.find((h) => h.owner_id === m.user_id);
      const status = statuses[m.user_id];
      if (!profile || !house || !status) continue;
      const online = !status.left_at && serverNow - new Date(status.last_seen_at).getTime() < STALE_MS;
      const say = status.message || "";   // 말풍선은 바꾸거나 지우기 전까지 유지된다
      list.push({ ...m, slot: house.slot, profile, house, status, online, say, shown: online ? status.status : "offline" });
    }
    return list.sort((a, b) => a.slot - b.slot);
  }, [raw, statuses, now, skew]);

  const me = residents.find((r) => r.user_id === userId) ?? null;

  const updateMyStatus = useCallback(
    async (patch: Partial<Pick<StatusRow, "status" | "topic" | "reading" | "message">>) => {
      if (!villageId || !userId) return;
      setStatuses((prev) =>
        prev[userId]
          ? { ...prev, [userId]: { ...prev[userId], ...patch, ...(patch.message !== undefined ? { message: patch.message.trim(), message_at: patch.message.trim() ? new Date(Date.now() + skew).toISOString() : null } : { left_at: null, last_seen_at: new Date(Date.now() + skew).toISOString() }) } }
          : prev,
      );
      const { error } = await supabase().from("research_status").update(patch).eq("village_id", villageId).eq("user_id", userId);
      if (error) void load();
    },
    [villageId, userId, skew, load],
  );

  /** 지도에서 누른 곳으로 걸어간다 (광장에서 쉬는 상태가 되고, 이웃 화면에서도 그 자리에 선다). 오류 문구를 돌려주고 성공이면 null */
  const walkTo = useCallback(
    async (x: number, y: number): Promise<string | null> => {
      if (!villageId || !userId) return null;
      setStatuses((prev) => (prev[userId] ? { ...prev, [userId]: { ...prev[userId], status: "rest", pos_x: x, pos_y: y, left_at: null, last_seen_at: new Date(Date.now() + skew).toISOString() } } : prev));
      const { error } = await supabase().rpc("walk_to", { p_village: villageId, p_x: x, p_y: y });
      if (error) { void load(); return error.message.includes("cannot_walk") ? "cannot_walk" : error.message; }
      return null;
    },
    [villageId, userId, skew, load],
  );

  /** 다른 마을로 옮겨 간다. 떠나는 마을에서는 곧바로 자리를 비운 것으로 보인다. */
  const switchVillage = useCallback(
    async (id: string) => {
      if (!userId || id === currentRef.current) return;
      if (villageId) void supabase().rpc("go_away", { p_village: villageId });
      currentRef.current = id;
      try {
        localStorage.setItem(lastKey(userId), id);
      } catch {}
      setRaw(null);
      setStatuses({});
      setLoading(true);
      await load();
    },
    [userId, villageId, load],
  );

  /** 내 화면의 마을 순서를 바꾼다(저장되어 다른 기기에서도 같다) */
  const reorderVillages = useCallback(async (ids: string[]) => {
    orderRef.current = ids;
    setVillages((cur) => [...cur].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)));
    await supabase().from("user_prefs").upsert({ village_order: ids, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }, []);

  const setStatus = useCallback((status: ResearchState) => updateMyStatus({ status }), [updateMyStatus]);

  return { loading, villages, switchVillage, reorderVillages, prevSeen: villageId ? prevSeen[villageId] ?? null : null, village: raw?.village ?? null, houses: raw?.houses ?? [], residents, me, skew, reload: load, setStatus, updateMyStatus, walkTo };
}
