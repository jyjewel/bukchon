"use client";
import { useState, useSyncExternalStore } from "react";

const KEY = (id: string) => `rv.fold.${id}`;
const QUERY = "(max-width: 1023px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** 폰에서만 쓰는 접기 상태. 폰이 아니면 undefined 라 창은 항상 펼쳐져 있다. 기본값은 접힘(defaultFolded) */
export function useFold(id: string, defaultFolded = true) {
  const phone = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const [folded, setFolded] = useState(() => {
    try {
      const saved = typeof window === "undefined" ? null : localStorage.getItem(KEY(id));
      return saved === null ? defaultFolded : saved === "1";
    } catch { return defaultFolded; }
  });
  const toggle = () => {
    const next = !folded;
    setFolded(next);
    try { localStorage.setItem(KEY(id), next ? "1" : "0"); } catch { /* 저장소를 못 써도 괜찮다 */ }
  };
  return phone ? { collapsed: folded, onToggle: toggle } : undefined;
}
