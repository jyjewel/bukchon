"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/** 순서를 바꿀 수 있는 연구실 위젯 (기본 순서) */
export const WIDGETS = ["deadlines", "todos", "journal", "notes", "diary"] as const;
export type WidgetId = (typeof WIDGETS)[number];
/** 접을 수 있는 창 (위젯 + 방·화이트보드) */
export const COLLAPSIBLE = ["room", "boards", ...WIDGETS] as const;
export type CollapsibleId = (typeof COLLAPSIBLE)[number];

interface Layout { order: WidgetId[]; collapsed: CollapsibleId[] }
const DEFAULT: Layout = { order: [...WIDGETS], collapsed: [] };

/** 저장된 값에서 모르는 항목을 빼고, 빠진 위젯은 기본 위치에 붙여 준다 (새 위젯이 생겨도 안전) */
function normalize(raw: unknown): Layout {
  const r = (raw && typeof raw === "object" ? raw : {}) as { order?: unknown; collapsed?: unknown };
  const saved = Array.isArray(r.order) ? r.order.filter((x): x is WidgetId => (WIDGETS as readonly string[]).includes(x as string)) : [];
  const order = [...new Set(saved), ...WIDGETS.filter((w) => !saved.includes(w))];
  const collapsed = Array.isArray(r.collapsed) ? [...new Set(r.collapsed.filter((x): x is CollapsibleId => (COLLAPSIBLE as readonly string[]).includes(x as string)))] : [];
  return { order, collapsed };
}

/** 내 연구실 창의 순서와 접힘 상태. 바꾸면 바로 화면에 반영하고 내 계정에 저장한다. */
export function useLabLayout(userId: string) {
  const [layout, setLayout] = useState<Layout>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(layout);

  useEffect(() => {
    let cancelled = false;
    supabase().from("profiles").select("lab_layout").eq("id", userId).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const l = normalize(data?.lab_layout);
      latest.current = l;
      setLayout(l);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const commit = useCallback(
    (next: Layout) => {
      latest.current = next;
      setLayout(next);
      // 쿼리는 결과를 기다려야(then) 실제로 전송된다
      supabase().from("profiles").update({ lab_layout: next }).eq("id", userId).then(() => undefined);
    },
    [userId],
  );

  const move = useCallback((id: WidgetId, dir: -1 | 1) => {
    const order = [...latest.current.order];
    const i = order.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    commit({ ...latest.current, order });
  }, [commit]);
  const toggle = useCallback((id: CollapsibleId) => {
    const c = latest.current.collapsed;
    commit({ ...latest.current, collapsed: c.includes(id) ? c.filter((x) => x !== id) : [...c, id] });
  }, [commit]);
  const setAll = useCallback((collapsed: boolean) => commit({ ...latest.current, collapsed: collapsed ? [...COLLAPSIBLE] : [] }), [commit]);

  return { order: layout.order, collapsed: layout.collapsed, loaded, move, toggle, setAll };
}
