"use client";
import { useState, type FormEvent } from "react";
import { NEWS_CATEGORIES } from "@/lib/constants";
import { errorMessage, supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import { useNews } from "@/hooks/useNews";
import type { NewsCategory, Resident } from "@/lib/types";
import { Modal, Notice } from "./ui";

const deadlineLabel = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
};

/** 마을 광장: 학회·채용·학술 뉴스를 이웃에게 알리는 곳 */
export default function PlazaNews({
  villageId, myId, isAdmin, residents, onClose,
}: { villageId: string; myId: string; isAdmin: boolean; residents: Resident[]; onClose: () => void }) {
  const news = useNews(villageId, true);
  const [cat, setCat] = useState<NewsCategory>("conference");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const who = (id: string | null) => (id ? residents.find((r) => r.user_id === id)?.profile.display_name ?? "떠난 주민" : "떠난 주민");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) return setError("링크는 http:// 또는 https:// 로 시작해야 해요.");
    setBusy(true);
    setError("");
    const { error } = await supabase().from("news_posts").insert({
      village_id: villageId, author_id: myId, category: cat, title: title.trim(), body: body.trim(), link_url: link.trim(), deadline: deadline || null,
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setTitle(""); setLink(""); setDeadline(""); setBody("");
    await news.reload();
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 소식을 지울까요?")) return;
    const { error } = await supabase().from("news_posts").delete().eq("id", id);
    if (error) setError(errorMessage(error));
    await news.reload();
  };

  return (
    <Modal title="마을 게시판" tone="mint" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="card p-3" style={{ background: "#fff3c4" }}>
          <p className="font-display text-lg">새로운 소식을 알려주세요!</p>
          <p className="mt-1 text-sm">학회·학술대회 공고, 채용공고, 연구비·공모사업, 학술 뉴스… 이웃 연구자에게 도움이 될 소식을 올려 주세요.</p>
        </div>

        <form onSubmit={submit} className="card space-y-2 p-3">
          <div className="flex flex-wrap items-center" role="group" aria-label="소식 종류">
            {NEWS_CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)} className={`btn btn-sm ${cat === c.id ? "btn-primary" : ""}`}>{c.label}</button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="news-title">제목</label>
            <input id="news-title" className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 한국사학회 가을 학술대회 발표 모집" required />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-48 flex-[2]">
              <label className="label" htmlFor="news-link">링크 <span className="text-ink-soft">(선택)</span></label>
              <input id="news-link" type="url" className="input" maxLength={600} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
            </div>
            <div className="min-w-40 flex-1">
              <label className="label" htmlFor="news-deadline">마감일 <span className="text-ink-soft">(선택)</span></label>
              <input id="news-deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="news-body">한마디 설명 <span className="text-ink-soft">(선택)</span></label>
            <textarea id="news-body" className="input" rows={2} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !title.trim()}>소식 올리기</button>
        </form>

        <ul className="space-y-2">
          {news.loaded && news.posts.length === 0 && <li className="py-3 text-center text-sm text-ink-soft">아직 올라온 소식이 없어요.</li>}
          {news.posts.map((p) => {
            const c = NEWS_CATEGORIES.find((x) => x.id === p.category);
            return (
              <li key={p.id} className="card p-3">
                <p className="flex flex-wrap items-center gap-1">
                  <span className="chip" style={{ background: c?.color }}>{c?.label}</span>
                  {p.deadline && <span className="chip">마감 {deadlineLabel(p.deadline)}</span>}
                  <span className="flex-1" />
                  <span className="text-xs text-ink-soft">{who(p.author_id)} · {relativeTime(p.created_at)}</span>
                </p>
                <h3 className="mt-1 break-words font-display">{p.title}</h3>
                {p.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{p.body}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {p.link_url && <a className="text-sm text-[#2f6fd0] underline" href={p.link_url} target="_blank" rel="noopener noreferrer">링크 열기</a>}
                  {(p.author_id === myId || isAdmin) && <button type="button" className="btn btn-sm btn-danger" onClick={() => void remove(p.id)}>지우기</button>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
