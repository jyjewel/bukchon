/** 화면이 보일 때만 주기적으로 불러온다. 안 보이는 탭·백그라운드에서는 쉬고, 다시 보이면 바로 한 번 불러온다(서버 부담과 배터리를 아낀다). */
const listeners = new Map<ReturnType<typeof setInterval>, () => void>();
export function visibleInterval(fn: () => void, ms: number): ReturnType<typeof setInterval> {
  const run = () => { if (typeof document === "undefined" || !document.hidden) fn(); };
  const id = setInterval(run, ms);
  document.addEventListener("visibilitychange", run);
  listeners.set(id, run);
  return id;
}
export function stopPoll(id: ReturnType<typeof setInterval>) {
  clearInterval(id);
  const l = listeners.get(id);
  if (l) { document.removeEventListener("visibilitychange", l); listeners.delete(id); }
}
