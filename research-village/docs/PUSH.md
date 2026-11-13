# 폰 푸시 알림

이웃이 던지기·선물·책 추천·응원·마감 독촉 등을 보내거나 대화 메시지가 오면, 켜 둔 기기로 폰 알림이 갑니다.

## 규칙
- 마을 화면을 열어 보고 있을 때는 울리지 않습니다(마을 안 알림이 대신함).
- ‘집중 연구’ 중인 사람에게는 보내지 않습니다(알림함에만 쌓임).
- 알림 문구에는 “누가 무엇을 했는지”만 들어가고 일지·메시지 내용은 들어가지 않습니다.
- 로그아웃하면 그 기기로는 더 이상 오지 않고, 다시 로그인하면 이어집니다.
- 아이폰은 사파리에서 ‘홈 화면에 추가’로 설치한 앱에서만 됩니다(iOS 16.4 이상).

## 구조
`notifications`·`messages` 에 행이 생기면 DB 트리거(`_push`)가 `pg_net` 으로 Edge Function `send-push` 를 부르고,
함수가 `push_subscriptions` 의 기기마다 웹 푸시(VAPID)를 보냅니다. 기기 쪽은 `public/sw.js` 가 알림을 띄웁니다.

## 서버 설정 (한 번만)
1. 마이그레이션 `20261125000000_push.sql` 적용
2. `push_config` 표에 네 줄 입력 (앱 사용자는 읽을 수 없는 표):
   - `push_url` = `https://<프로젝트>.supabase.co/functions/v1/send-push`
   - `push_secret` = 임의의 긴 문자열 (트리거와 함수가 서로 확인하는 값)
   - `vapid_public` = 공개 키 (`src/lib/push.ts` 의 `VAPID_PUBLIC_KEY` 와 같아야 함)
   - `vapid_private` = 비밀 키
3. Edge Function `send-push` 배포 (JWT 검증은 끔: 함수가 `push_secret` 으로 직접 확인)

VAPID 키를 바꾸면 기존 구독이 모두 무효가 되므로 사용자가 알림을 다시 켜야 합니다.
