"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Book, BookEntry, Meeting } from "@/lib/types";

/** 도서관: 공동 집필 책과 Zoom 회의 (실시간) */
export function useLibrary(villageId: string) {
  const [books, setBooks] = useState<Book[]>([]);
  const [entries, setEntries] = useState<BookEntry[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const [b, e, m] = await Promise.all([
      sb.from("books").select("*").eq("village_id", villageId).order("created_at", { ascending: false }),
      sb.from("book_entries").select("*").eq("village_id", villageId).order("created_at"),
      sb.from("meetings").select("*").eq("village_id", villageId).order("starts_at"),
    ]);
    if (b.error || e.error || m.error) return;
    setBooks(b.data as Book[]);
    setEntries(e.data as BookEntry[]);
    setMeetings(m.data as Meeting[]);
    setLoaded(true);
  }, [villageId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러온다
    void load();
    const sb = supabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const again = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 200);
    };
    const channel = sb
      .channel(`library:${villageId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "book_entries" }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, again)
      .subscribe();
    const poll = setInterval(() => void load(), 60_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [load, villageId]);

  return { books, entries, meetings, loaded, reload: load };
}
