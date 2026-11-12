# 연구자 마을 (Research Village)

6명이 함께 살아가는 작은 디지털 연구 마을. 각자의 집에서 연구하다가, 집 밖으로 나오면 서로 만날 수 있습니다.

![마을 화면](docs/village.png)

## 지금 되는 것 (Phase 1)

- 이메일 회원가입·로그인, 프로필과 캐릭터 꾸미기
- 6명 정원의 비공개 마을 만들기, 초대 링크(7일 만료·재발급·폐기)로 입주
- 마을 지도: 집 6채, 집 앞 책상, 공동 도서관, 광장, 게시판, 계절·시간대에 따른 색 변화
- 연구 상태(집중 / 열린 연구 / 공동 연구 / 휴식 / 오프라인)에 따라 캐릭터가 이동하고, 다른 주민 화면에 실시간 반영
- 내 연구실: 서버 시각 기준 연구 타이머(시작·일시정지·종료), 오늘·주·월·분야별 기록, 오늘의 목표, 개인 노트
- 연구 다이어리: 나만 보기 / 우리 마을 / 선택한 연구자 공개
- 주민 미니홈피(프로필·현재 상태·공개된 다이어리), 집 꾸미기(지붕·벽 색)
- 마을 관리(이름 변경, 주민 내보내기), 내 데이터 내려받기, 마을 떠나기, 계정 삭제

아직 없는 것: 채팅·대화 신청·Zoom·방명록·댓글·사진(Phase 2), 논문 알림·게시판 내용·보상(Phase 3), 마을 간 방문(Phase 4), 소셜 로그인, 비밀번호 재설정 메일. 화면에는 "다음 단계에서 열려요"라고만 표시하고 동작하지 않는 버튼은 두지 않았습니다.

## 구조

| 위치 | 내용 |
| --- | --- |
| `supabase/migrations/` | 테이블, RLS 정책, RPC 함수 (정원·초대·타이머·접속 상태) |
| `src/hooks/` | `useAuth`, `useVillage`(실시간 동기화·heartbeat), `useTimer`, `useNotes`, `useDiary` |
| `src/components/` | `VillageScene`(SVG 마을), `StudyRoom`, `DiaryView`, `ProfileModal`, `SettingsView` 등 |
| `scripts/test-backend.mjs` | 정원·권한·타이머 규칙 검증 |

서버 코드가 없는 정적 앱입니다. 브라우저는 공개(anon) 키만 쓰고, 모든 접근 제어는 데이터베이스의 Row Level Security가 맡습니다.

- 모든 마을 데이터는 `village_id`로 분리되고, 주민이 아니면 읽을 수 없습니다.
- 정원 6명은 `houses` 6행을 잠그며 배정하는 방식으로 DB가 보장합니다(동시 가입 포함).
- 연구 시간·목표·노트는 본인만 읽을 수 있습니다. 연구 시간 공유는 본인이 켠 경우에만, 오늘 합계만 보입니다.
- 접속 여부(`last_seen_at`)와 타이머는 서버 시각으로만 기록됩니다. 150초 넘게 접속이 끊기면 오프라인으로 보이고, 다시 들어올 때 돌던 타이머는 마지막 접속 시각까지만 인정해 일시정지하며 상태는 '휴식'으로 돌아갑니다.

## 실제로 쓰기 (Supabase + 정적 호스팅)

1. [supabase.com](https://supabase.com)에서 프로젝트를 만듭니다.
2. SQL Editor에 `supabase/migrations/20261112000000_phase1.sql` 내용을 붙여 넣고 실행합니다.
   (CLI를 쓴다면 `npx supabase link` 후 `npx supabase db push`)
3. Authentication → URL Configuration의 Site URL에 배포할 주소를 넣습니다.
4. `.env.example`을 `.env.local`로 복사하고 Project URL과 anon(publishable) 키를 넣습니다.
5. `npm install && npm run build` → `out/` 폴더를 Vercel·Netlify·GitHub Pages 등에 올립니다.
   하위 경로에 올릴 때는 빌드 전에 `NEXT_PUBLIC_BASE_PATH=/경로`를 지정합니다.

## 내 컴퓨터에서 실행

Docker가 필요합니다.

```bash
npm install
npm run db:start        # 로컬 Supabase 시작, 출력된 API URL과 anon key를 .env.local 에 넣기
npm run dev             # http://localhost:3000
npm run test:backend    # 권한·정원·타이머 규칙 검사
```

두 개의 브라우저(또는 시크릿 창)로 각각 가입해 한쪽에서 마을을 만들고 설정의 초대 링크로 다른 쪽이 입주하면, 상태 변화가 서로에게 바로 보입니다.
