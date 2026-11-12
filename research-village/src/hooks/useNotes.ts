"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Notes {
  goal: string;
  goal_minutes: number;
  note: string;
}
const EMPTY: Notes = { goal: "", goal_minutes: 0, note: "" };

/** 오늘의 목표와 개인 노트 (본인만 볼 수 있음). 입력을 멈추면 자동 저장한다. */
export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Notes>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const latest = useRef<Notes>(EMPTY);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    supabase().from("study_notes").select("goal, goal_minutes, note").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (data) {
        latest.current = data as Notes;
        setNotes(data as Notes);
      }
      setLoaded(true);
    });
  }, [userId]);

  const flush = useCallback(async () => {
    if (!userId) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    setState("saving");
    const { error } = await supabase().from("study_notes").upsert({ user_id: userId, ...latest.current });
    setState(error ? "error" : "saved");
  }, [userId]);

  const update = useCallback(
    (patch: Partial<Notes>) => {
      latest.current = { ...latest.current, ...patch };
      setNotes(latest.current);
      setState("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  // 화면을 떠날 때 아직 저장하지 않은 내용이 있으면 바로 저장
  useEffect(() => () => {
    if (timer.current) void flush();
  }, [flush]);

  return { notes, loaded, state, update, flush };
}
