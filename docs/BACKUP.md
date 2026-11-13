# 자동 백업 (매일 새벽 3시 17분, 한국 시간)

연구자 마을의 **모든 기록**(일지·연구노트·다이어리·이력·화이트보드·대화 등)을 매일 한 번 내려받아 **암호화**한 뒤
GitHub Actions 보관함에 **90일 동안** 보관합니다. 이 저장소는 공개라서, 암호 없이는 아무도 열 수 없게 만들었습니다.

## 처음 한 번만 하는 설정 (약 5분)

필요한 비밀값은 두 개입니다. **둘 다 채팅이나 코드에 붙여 넣지 말고, 아래 GitHub 화면에만 입력하세요.**

1. **Supabase 서비스 키 복사**
   Supabase 대시보드 → 프로젝트 `Research Community` → 왼쪽 아래 *Project Settings* → *API Keys* →
   **`service_role` (또는 Secret keys 의 `secret`) 키**의 *Copy*.
   (`anon`/`publishable` 키가 아니라, "비밀"이라고 적힌 쪽입니다. 이 키는 모든 데이터를 읽을 수 있으니 절대 공개하지 마세요.)
2. **백업 암호 정하기**
   길고 기억하기 쉬운 문장 하나를 정하세요. (예: 마음에 드는 문장 5~6단어 + 숫자)
   **이 암호를 비밀번호 관리자나 종이에 꼭 적어 두세요.** 암호를 잃으면 백업을 열 수 없습니다.
3. **GitHub 에 입력**
   저장소(`jyjewel/bukchon`) → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*
   - 이름 `SUPABASE_SERVICE_KEY` / 값: 1번에서 복사한 키
   - 이름 `BACKUP_PASSPHRASE` / 값: 2번의 암호
4. **한 번 시험해 보기**
   저장소 → *Actions* 탭 → 왼쪽 *Daily backup* → *Run workflow* → 초록색 체크가 뜨면 성공.
   (실패하면 빨간 X 와 이유가 보이고, GitHub 가 이메일로도 알려 줍니다.)

## 백업 받아 보기

저장소 → *Actions* → *Daily backup* → 원하는 날짜의 실행 → 아래쪽 *Artifacts* 의 `research-village-backup` 을 내려받으면
`backup-날짜.tar.gz.enc` 파일이 들어 있습니다.

## 열기 (복호화)

터미널(맥·리눅스, 윈도우는 Git Bash 또는 WSL)에서:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in backup-2026-11-13.tar.gz.enc -out backup.tar.gz
tar -xzf backup.tar.gz
```

암호를 물으면 2번의 백업 암호를 입력합니다. 열면 이런 파일이 나옵니다.

- `per-user/사람이름-….md` — 사람별 일지·연구노트·다이어리를 읽기 쉬운 텍스트로 정리한 파일
- `backup.json` — 모든 표(테이블)의 원본 데이터. 복구가 필요하면 이 파일로 되살립니다.

## 참고

- 백업은 매일 새로 쌓이고, 90일이 지난 것은 GitHub 가 자동으로 지웁니다. 중요한 시점의 백업은 직접 내려받아 따로 보관하세요.
- 이 백업은 데이터베이스를 매일 한 번 읽기 때문에, 무료 요금제의 "오래 안 쓰면 일시 정지"도 막아 줍니다.
- 복구가 필요하면 `backup.json` 과 이 저장소를 가지고 Claude 에게 요청하면 됩니다.
