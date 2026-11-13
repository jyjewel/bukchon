"use client";
import { useEffect, useState } from "react";
import { isConfigured } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useVillage } from "@/hooks/useVillage";
import AuthScreen from "./AuthScreen";
import ProfileForm from "./ProfileForm";
import VillageGate from "./VillageGate";
import VillageApp from "./VillageApp";
import type { AppNotification } from "@/lib/types";
import { Window } from "./ui";

const INVITE_KEY = "rv.invite";

/** 주소의 ?invite=코드 를 기억해 두었다가(가입·이메일 인증을 거쳐도 유지) 마을 입구에서 쓴다. */
function useInviteCode() {
  const [code, setCode] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("invite");
    if (fromUrl) {
      try {
        localStorage.setItem(INVITE_KEY, fromUrl);
      } catch {}
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", url.toString());
    }
    let stored = fromUrl ?? "";
    try {
      stored = stored || localStorage.getItem(INVITE_KEY) || "";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 주소·저장소는 마운트 후에만 읽을 수 있다
    setCode(stored);
  }, []);
  const clear = () => {
    try {
      localStorage.removeItem(INVITE_KEY);
    } catch {}
    setCode("");
  };
  return { code, clear };
}

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-4">
      <header className="text-center">
        <h1 className="font-display text-3xl">연구자 마을</h1>
        <p className="text-sm text-ink-soft">6명이 함께 살아가는 작은 디지털 연구 마을</p>
      </header>
      {children}
    </main>
  );
}

function Loading() {
  return <Splash><p className="text-center text-sm text-ink-soft" role="status">마을로 가는 길을 찾는 중…</p></Splash>;
}

export default function App() {
  if (!isConfigured) {
    return (
      <Splash>
        <Window title="설정이 필요해요" icon="" tone="butter">
          <div className="space-y-2 p-4 text-sm">
            <p>Supabase 연결 정보가 없어요. <code>.env.local</code> 파일에 아래 두 값을 넣고 다시 실행해 주세요.</p>
            <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs">NEXT_PUBLIC_SUPABASE_URL=…{"\n"}NEXT_PUBLIC_SUPABASE_ANON_KEY=…</pre>
            <p>자세한 방법은 <code>README.md</code>를 참고하세요.</p>
          </div>
        </Window>
      </Splash>
    );
  }
  return <Configured />;
}

function Configured() {
  const auth = useAuth();
  const invite = useInviteCode();
  const village = useVillage(auth.userId, auth.session?.access_token ?? null);
  const [adding, setAdding] = useState(false); // 다른 마을 추가(입주·만들기) 화면
  const [pendingOpen, setPendingOpen] = useState<AppNotification | null>(null); // 다른 마을의 알림을 열려고 마을을 옮기는 중

  if (!auth.ready) return <Loading />;
  if (!auth.session || !auth.userId) return <Splash><AuthScreen hasInvite={Boolean(invite.code)} /></Splash>;
  if (!auth.profile) return <Loading />;
  if (!auth.profile.onboarded) {
    return (
      <Splash>
        <Window title="나의 연구자 캐릭터 만들기" icon="" tone="lilac">
          <div className="p-4">
            <ProfileForm profile={auth.profile} submitLabel="이 모습으로 시작하기" onSaved={auth.reloadProfile} markOnboarded />
          </div>
        </Window>
      </Splash>
    );
  }
  if (village.loading) return <Loading />;
  const inVillage = Boolean(village.village && village.me);
  // 초대 링크로 들어오면(이미 마을이 있어도) 입주 화면을 먼저 보여 준다.
  if (!inVillage || adding || invite.code) {
    const back = () => { invite.clear(); setAdding(false); };
    return (
      <Splash>
        <VillageGate
          inviteCode={invite.code}
          onClearInvite={invite.clear}
          onCancel={inVillage ? back : undefined}
          onDone={(id) => { back(); void village.switchVillage(id); }}
        />
      </Splash>
    );
  }
  return (
    <VillageApp
      auth={auth}
      v={village}
      onAddVillage={() => setAdding(true)}
      pendingOpen={pendingOpen}
      onPendingHandled={() => setPendingOpen(null)}
      onOpenInOtherVillage={(n) => { setPendingOpen(n); void village.switchVillage(n.village_id); }}
    />
  );
}
