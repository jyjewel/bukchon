"use client";
import { Children, createContext, isValidElement, useContext, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortSensors } from "./Sortable";

/** 창 제목줄을 잡고 끌 수 있게 하는 손잡이(Window 가 읽어 쓴다) */
type Grip = { listeners: Record<string, unknown> | undefined; dragging: boolean };
const GripCtx = createContext<Grip | null>(null);
export const useWindowGrip = () => useContext(GripCtx);

const keyOf = (userId: string, col: string) => `win-order:${userId}:${col}`;
function loadOrder(userId: string, col: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(keyOf(userId, col)) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

function Shell({ id, children }: { id: string; children: ReactNode }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 20 : undefined, position: "relative" };
  return <div ref={setNodeRef} style={style}><GripCtx.Provider value={{ listeners: listeners as Record<string, unknown> | undefined, dragging: isDragging }}>{children}</GripCtx.Provider></div>;
}

/** 같은 칸 안의 창들을 제목줄을 끌어서 순서를 바꾼다. 순서는 이 기기에 기억한다. children 은 key 가 있는 요소여야 한다. */
export default function WindowColumn({ col, userId, className = "", children }: { col: string; userId: string; className?: string; children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>(() => loadOrder(userId, col));
  const sensors = useSortSensors();
  const els = Children.toArray(children).filter((c): c is ReactElement => isValidElement(c) && c.key != null);
  const keys = els.map((e) => String(e.key));
  const ordered = [...saved.filter((k) => keys.includes(k)), ...keys.filter((k) => !saved.includes(k))];
  const byKey = new Map(els.map((e) => [String(e.key), e]));
  const onEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(ordered, ordered.indexOf(String(e.active.id)), ordered.indexOf(String(e.over.id)));
    setSaved(next);
    try { localStorage.setItem(keyOf(userId, col), JSON.stringify(next)); } catch { /* 저장 못 해도 이번엔 옮겨진다 */ }
  };
  return (
    <div className={className}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
        <SortableContext items={ordered} strategy={verticalListSortingStrategy}>
          {ordered.map((k) => <Shell key={k} id={k}>{byKey.get(k)}</Shell>)}
        </SortableContext>
      </DndContext>
    </div>
  );
}
