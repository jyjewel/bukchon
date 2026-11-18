# 소원구슬

마을 광장(도서관 오른쪽)의 소원구슬을 누르면 주민이 "이런 게 있으면 좋겠어요"를 적을 수 있습니다. 하루에 사람마다 3개까지.

## 처리 방법 (운영자)
소원은 **자동으로 코드가 되지 않습니다.** 주민이 쓴 글은 요청일 뿐이고, 만들기와 배포는 운영자가 정합니다.

1. Claude 에게 "소원 확인해"라고 하면 대기 중인 소원(`status = 'new'`)을 읽어 옵니다.
2. 만들 소원은 `status = 'doing'`, 이뤄지면 `'done'`, 어려우면 `'declined'` 로 바꾸고 `reply`(200자)에 한마디를 남깁니다.
3. 만든 결과는 보여 주고, "반영해" 후에 배포합니다.
4. 소원을 반영한 업데이트는 `src/lib/updates.ts` 의 새 소식 제목 맨 앞에 **`[소원] `** 을 붙입니다. (깜짝 업데이트는 소식에 적지 않는 원칙은 그대로)

```sql
-- 대기 중인 소원
select w.id, p.display_name, w.body, w.created_at from wishes w join profiles p on p.id = w.author_id where w.status = 'new' order by w.created_at;
-- 상태와 답 남기기
update wishes set status = 'doing', reply = '만드는 중이에요!' where id = '...';
```

상태·답은 서버(서비스 키·관리 API)로만 바꿀 수 있고, 주민은 대기 중인 자기 소원만 거둘 수 있습니다.
