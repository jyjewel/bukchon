"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { HEARTBEAT_MS, STALE_MS } from "@/lib/constants";
import { PROFILE_COLUMNS } from "./useAuth";
import type { House, Profile, ResearchState, Resident, StatusRow, Village } from "@/lib/types";

interface Raw {
  village: Village;
  members: { user_id: string; role: "admin" | "member"; joined_at: string }[];
  houses: House[];
  profiles: Profile[];
}

/**
 * 내가 사는 마을의 주민·집·연구 상태를 불러오고 실시간으로 동기화한다.
 *  - research_status 변경은 Realtime 으로 즉시 반영
 *  - 25초마다 heartbeat 로 접속 중임을 서버에 알리고, 놓친 이벤트에 대비해 다시 읽는다
 */
export function useVillage(userId: string | null, accessToken: string | null) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<Raw | null>(null);
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
    const mine = await sb.from("village_members").select("village_id").eq("user_id", userId).order("joined_at").limit(1);
    const vid = mine.data?.[0]?.village_id as string | undefined;
    if (mine.error) return; // 일시적 오류: 기존 화면 유지
    if (!vid) {
      setRaw(null);
      setStatuses({});
      setLoading(false);
      return;
    }
    const [v, m, h, s] = await Promise.all([
      sb.from("villages").select("id, name, theme").eq("id", vid).maybeSingle(),
      sb.from("village_members").select("user_id, role, joined_at").eq("village_id", vid),
      sb.from("houses").select("village_id, slot, owner_id, style").eq("village_id", vid).order("slot"),
      sb.from("research_status").select("*").eq("village_id", vid),
    ]);
    if (!v.data || !m.data || !h.data || !s.data) return;
    const p = await sb.from("profiles").select(PROFILE_COLUMNS).in("id", m.data.map((x) => x.user_id));
    if (!p.data) return;
    setRaw({ village: v.data as Village, members: m.data as Raw["members"], houses: h.data as House[], profiles: p.data as Profile[] });
    setStatuses(Object.fromEntries((s.data as StatusRow[]).map((r) => [r.user_id, r])));
    setLoading(false);
  }, [userId]);

  // 첫 로드
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 로그인 사용자가 바뀌면 마을을 다시 읽는다
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
      list.push({ ...m, slot: house.slot, profile, house, status, online, shown: online ? status.status : "offline" });
    }
    return list.sort((a, b) => a.slot - b.slot);
  }, [raw, statuses, now, skew]);

  const me = residents.find((r) => r.user_id === userId) ?? null;

  const updateMyStatus = useCallback(
    async (patch: Partial<Pick<StatusRow, "status" | "topic" | "reading">>) => {
      if (!villageId || !userId) return;
      setStatuses((prev) =>
        prev[userId]
          ? { ...prev, [userId]: { ...prev[userId], ...patch, left_at: null, last_seen_at: new Date(Date.now() + skew).toISOString() } }
          : prev,
      );
      const { error } = await supabase().from("research_status").update(patch).eq("village_id", villageId).eq("user_id", userId);
      if (error) void load();
    },
    [villageId, userId, skew, load],
  );

  const setStatus = useCallback((status: ResearchState) => updateMyStatus({ status }), [updateMyStatus]);

  return { loading, village: raw?.village ?? null, houses: raw?.houses ?? [], residents, me, skew, reload: load, setStatus, updateMyStatus };
}
