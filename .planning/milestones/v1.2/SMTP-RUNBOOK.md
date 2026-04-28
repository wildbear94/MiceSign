# MiceSign 운영 SMTP 전환 런북 (v1.2)

**작성:** 2026-04-28 (Phase 33 D-M2)
**대상 청자:** 출시 담당 개발자 + 사내 IT 부서 (§1 만 발췌하여 공유)
**선결 조건:** Phase 29 (SMTP 인프라) 완료, Phase 33-01 (`application-prod.yml` 자격증명 위생) 완료
**참조:**
- 인계 결정: `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` (D-D2 / D-A11 / D-B6)
- 사전 산출물: `backend/src/main/resources/application-prod.yml.example` (Phase 33-01)
- 후속 모니터링: `.planning/milestones/v1.2/MONITORING.md` (Phase 33-03 산출물 — NFR-01 검색 95p)

---

## 목차

1. 사전 준비 (사내 IT 협업)
2. 환경변수 설정 (`/etc/micesign/.env.production`)
3. systemd unit 의 `EnvironmentFile=` 도입
4. 재시작 + startup 검증 (Phase 29 D-D2 BaseUrlGuard)
5. 5종 이벤트 수동 smoke (D-M3)
6. 트러블슈팅 + 주기적 점검

---

## §0. 본 런북 사용법

본 런북은 **출시 직전 1회 순차 수행** + **출시 후 §6 주간 점검 사이클** 두 단계로 운영한다.

- **사내 IT 부서와 공유 시:** §1 (사전 준비) 만 발췌하여 전달. §2-6 은 운영 담당 개발자만 수행.
- **재현 시 (예: 6개월 후 메일 서버 교체):** §1 부터 다시 순차 수행. 본 런북이 자기완결적이므로 외부 문서 의존 없이 진행 가능.
- **체크박스 (`- [ ]`):** 각 단계는 사전 점검용 checklist. 모든 박스 PASS 후에만 다음 §로 진행.
- **명령 표기:** 한국어 본문 + 영어 식별자/명령. `$VAR` 표기는 운영자가 실 값으로 치환 (예: `$MAIL_HOST` → `mail.사내도메인`).

---

## §1. 사전 준비 (사내 IT 협업) — D-M1

> 본 § 는 사내 IT 부서와 공유하여 협의 진행. IT 가 (a) host/port 결정 + (b) IP allowlist 등록 + (c) From 도메인 승인 + (d) 테스트 메일 1통 송신 검증 4가지를 회신할 때까지 §2 로 진행 금지.

### 1.1 사내 메일 릴레이 정보 확보

사내 IT 담당자에게 다음 항목 협의 요청:

- [ ] **MAIL_HOST** — 사내 메일 릴레이 호스트명 (예: `mail.사내도메인` 또는 `relay.사내도메인`).
- [ ] **MAIL_PORT** — 일반적으로 **25** (사내 평문) 또는 **587** (STARTTLS). 465 (SMTPS) 는 사내 릴레이에서 거의 사용 안 함.
- [ ] **인증 방식 확정** — 사내 릴레이 표준 패턴은 다음 둘 중 하나:
  - **(권장) IP allowlist 기반** — `MAIL_USERNAME` / `MAIL_PASSWORD` 빈 값 가능. MiceSign 운영 서버 IP 를 IT 에 통보 + allowlist 추가 요청.
  - **(드뭄) SMTP AUTH 기반** — 전용 메일 계정 발급 받기 (예: `micesign-svc@사내도메인` + 임시 패스워드). 발급 후 즉시 §2 의 `.env.production` 에만 적재 + IT 측 발급 통신 폐기.
- [ ] **From 도메인 승인** — `noreply@사내도메인` 또는 `micesign@사내도메인` 발신 허용 요청. SPF / DKIM / DMARC 레코드 설정은 IT 책임.
- [ ] **테스트 메일 1통 송신 검증** — 협의 완료 후 IT 가 임의 사내 메일주소로 SMTP 핸드셰이크 1회 검증. 본 검증은 §4.3 의 `telnet` 핸드셰이크와 별개로, IT 측 인프라 자체의 정상성을 사전 확인하는 단계.

### 1.2 운영 서버 측 사전 점검

운영 서버에서 다음을 확인 (개발자 수행):

- [ ] systemd 기반 Linux 서버 (PRD 표준 — Native deployment, no Docker).
- [ ] `micesign` 시스템 user / group 존재 (Phase 1 deployment 시 생성됨). 미존재 시:
  ```bash
  sudo useradd -r -s /sbin/nologin -d /opt/micesign micesign
  ```
- [ ] `/etc/micesign/` 디렉토리 존재 + 권한 700:
  ```bash
  sudo install -d -o root -g root -m 700 /etc/micesign
  ```
- [ ] systemd unit 파일 존재 — `/etc/systemd/system/micesign.service` (Phase 1 deployment 산출물).
- [ ] DB (MariaDB 10.11+) 가 운영 환경에 설치되어 있고 micesign DB / user 가 사전 생성됨 (Flyway V1~V19 적용 가능 상태).
- [ ] 배포 자체는 본 런북 범위 밖 — `.jar` 빌드 + 운영 서버 전송은 GitHub Actions / 수동 SCP 어느 쪽이든 무관.

---

## §2. 환경변수 설정 — D-C1 + D-M1

> **D-C2 (secret 도구 미도입) 메모:** 본 절차는 systemd `EnvironmentFile=` + `chmod 600` 으로 충분 (50인 단일 환경 가정). Vault / SOPS / git-crypt / AWS Secrets Manager 도입은 거절 (D-C2). 50인 → 200인 확장 시점 또는 v2 마일스톤에서 재검토.

### 2.1 `.env.production` 작성

`backend/src/main/resources/application-prod.yml.example` (Phase 33-01 산출물 — 운영 변수 카탈로그) 을 템플릿으로 사용:

```bash
# 1. 빈 600 권한 파일 선생성 (race-free)
sudo install -o micesign -g micesign -m 600 /dev/null /etc/micesign/.env.production

# 2. 카탈로그를 임시 파일로 복사 후 값 채우기
sudo cp backend/src/main/resources/application-prod.yml.example /tmp/env.draft
sudo vi /tmp/env.draft
#   - DB_HOST/PORT/NAME 채우기
#   - DB_USER/DB_PASS 채우기 (HikariCP 가 빈 값이면 startup fail — D-C1 fail-fast 의도)
#   - APP_BASE_URL 을 사내 실 도메인으로 (localhost 절대 금지 — D-D2 BaseUrlGuard 가 fail-fast)
#   - MAIL_HOST / MAIL_PORT 채우기 (§1 IT 협의 결과)
#   - (선택) MAIL_USERNAME / MAIL_PASSWORD — IP allowlist 면 빈 값
#   - 헤더 주석 (#) 은 그대로 두어도 무방 — systemd 가 무시함

# 3. 검증된 임시 파일을 운영 위치로 install + 임시 파일 안전 삭제
sudo install -o micesign -g micesign -m 600 /tmp/env.draft /etc/micesign/.env.production
sudo shred -u /tmp/env.draft
```

### 2.2 권한 검증

```bash
stat -c '%a %U:%G %n' /etc/micesign/.env.production
# 기대 출력:
#   600 micesign:micesign /etc/micesign/.env.production
```

`600` 외 권한이거나 owner 가 `micesign:micesign` 이 아니면 즉시:

```bash
sudo chown micesign:micesign /etc/micesign/.env.production
sudo chmod 600 /etc/micesign/.env.production
```

### 2.3 필수 변수 체크리스트 (D-C1 기반)

- [ ] `DB_HOST` — MariaDB 호스트 (단일 서버면 `localhost`).
- [ ] `DB_PORT` — 일반적으로 `3306`.
- [ ] `DB_NAME` — `micesign`.
- [ ] `DB_USER` — 채워짐 (빈 값 → HikariCP startup fail).
- [ ] `DB_PASS` — 채워짐 (빈 값 → HikariCP startup fail).
- [ ] `APP_BASE_URL` — `https://` + 사내 실 도메인. **localhost / 127.0.0.1 절대 금지** — Phase 29 D-D2 의 `BaseUrlGuard` 가 startup `IllegalStateException` 으로 막음.
- [ ] `MAIL_HOST` — §1 협의 결과 (예: `mail.사내도메인`). 미설정 시 `JavaMailSender` bean 생성 skip + `ApprovalEmailSender` 가 stub 모드로 fallback (Phase 29 D-D7) — 운영 환경에서 stub 모드는 사고이므로 반드시 채울 것.
- [ ] `MAIL_PORT` — 25 또는 587.
- [ ] (필요시) `MAIL_USERNAME` / `MAIL_PASSWORD` — SMTP AUTH 사용 시.

### 2.4 위생 검증 (실 commit 차단 확인)

운영 서버 외 개발자 PC 에서 실수로 `.env.production` 을 repo 안에 만들어도 git 추적되지 않는지 확인:

```bash
# 어느 디렉토리든 .env.production 이 staged 되지 않는지 확인 (Phase 33-01 .gitignore line 28-29)
cd /path/to/MiceSign
echo "TEST=1" > .env.production
git status --short | grep -q '\.env\.production' && echo "FAIL: leak risk" || echo "PASS: ignored"
rm .env.production
```

기대: `PASS: ignored`. FAIL 시 Phase 33-01 의 `.gitignore` 변경 commit `12fc094` 이 누락된 상태 — 즉시 보강.

---

## §3. systemd unit 의 `EnvironmentFile=` 도입 — D-C1 4단계

### 3.1 기존 unit 확인

```bash
sudo systemctl cat micesign.service
```

`[Service]` 섹션을 찾는다. 일반적으로 다음 형태:

```ini
[Service]
Type=simple
User=micesign
Group=micesign
WorkingDirectory=/opt/micesign
ExecStart=/usr/bin/java -jar /opt/micesign/app.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10
```

### 3.2 `EnvironmentFile=` 라인 추가 (drop-in override 권장)

기존 unit 파일을 직접 수정하지 않고 systemd drop-in 으로 보강:

```bash
sudo systemctl edit micesign.service
```

에디터가 열리면 다음 내용 입력 후 저장:

```ini
[Service]
EnvironmentFile=/etc/micesign/.env.production
```

저장 후 자동으로 `/etc/systemd/system/micesign.service.d/override.conf` 가 생성됨. systemd 데몬 reload:

```bash
sudo systemctl daemon-reload
```

### 3.3 unit 의 효과 확인

```bash
sudo systemctl show micesign.service -p EnvironmentFiles
# 기대 출력 예:
#   EnvironmentFiles=/etc/micesign/.env.production (ignore_errors=no)
```

`/etc/micesign/.env.production` 가 출력되지 않으면 §3.2 의 drop-in 작성/저장 누락 → 재시도.

### 3.4 권한 매트릭스 최종 확인 (출시 전 마지막 게이트)

| 대상 | 기대 권한 | 기대 owner | 검증 명령 |
|------|----------|-----------|-----------|
| `/etc/micesign/` | `700` | `root:root` | `stat -c '%a %U:%G' /etc/micesign` |
| `/etc/micesign/.env.production` | `600` | `micesign:micesign` | `stat -c '%a %U:%G' /etc/micesign/.env.production` |
| `/etc/systemd/system/micesign.service.d/override.conf` | `644` | `root:root` | `stat -c '%a %U:%G' /etc/systemd/system/micesign.service.d/override.conf` |

3행 모두 일치하지 않으면 즉시 `chmod` / `chown` 으로 보정 후 §4 진행.

---

## §4. 재시작 + startup 검증 — Phase 29 D-D2 BaseUrlGuard

### 4.1 재시작

```bash
sudo systemctl restart micesign
sleep 5
sudo systemctl status micesign --no-pager
# 기대: "Active: active (running)"
```

`active (failed)` 또는 `activating (auto-restart)` 면 §6.1 / §6.2 트러블슈팅으로.

### 4.2 startup 로그에서 BaseUrlGuard PASS 확인 (필수 게이트)

Phase 29 D-D2 의 `BaseUrlGuard` (`@Profile("prod") @Component` ApplicationReadyEvent listener) 는 `app.base-url` 값에 `localhost` 가 포함되면 startup `IllegalStateException` 으로 process 를 죽인다 — 메일 본문에 비공개 내부 URL 이 발송되는 사고를 막는 fail-fast.

다음 grep 실행 후 결과 두 개 모두 PASS 인지 검증:

```bash
# 게이트 1 — BaseUrlGuard 로그가 존재하는가? (listener 가 발화했는가)
sudo journalctl -u micesign -n 500 --no-pager | grep -E 'BaseUrlGuard|app\.base-url'

# 게이트 2 — 그 어떤 라인에도 'localhost' 가 없는가?
sudo journalctl -u micesign -n 500 --no-pager | grep -E 'app\.base-url' | grep -v localhost
```

기대:
- 게이트 1: `BaseUrlGuard` 가 `app.base-url=https://micesign.사내도메인` 형식으로 1줄 이상 로그 출력.
- 게이트 2: 게이트 1 의 출력이 `localhost` 를 포함하지 않음 (`grep -v` 가 라인을 제거하지 않음).
- 추가: `HikariPool-1 - Start completed` 로그 존재 (DB 연결 성공).

만약 `IllegalStateException: app.base-url contains 'localhost'` 가 보이면 startup fail — §6.1 (BaseUrlGuard 실패) 트러블슈팅으로.

### 4.3 SMTP 핸드셰이크 검증 (운영 서버 → 사내 릴레이 도달성)

```bash
# 운영 서버에서 MAIL_HOST/PORT 가 도달 가능한지 확인
# (env 변수 export 하지 말고 실 값을 직접 입력 — secret 누출 방지)
telnet <MAIL_HOST> <MAIL_PORT>
# 기대: "220 ... ESMTP ..." banner 출력 → 'QUIT' 입력 후 연결 종료
```

만약 `telnet` 미설치면:

```bash
# nc 대안 (대부분 기본 설치)
nc -zv <MAIL_HOST> <MAIL_PORT>
# 기대: "Connection ... succeeded!"
```

STARTTLS (587) 포트면 추가로:

```bash
openssl s_client -connect <MAIL_HOST>:<MAIL_PORT> -starttls smtp
# 기대: 인증서 chain 출력 + "250-STARTTLS" 응답
```

도달 불가 시 §1.1 의 IT 협의로 회귀 — IP allowlist 추가 재요청.

---

## §5. 5종 이벤트 수동 smoke — D-M3

Phase 29 의 GreenMail 자동 회귀 (`ApprovalNotificationIntegrationTest`) 가 백엔드 로직을 보장하므로, 본 smoke 는 **운영 SMTP 연결성 + 한글 디코딩 + From/Reply-To 헤더 + 실제 메일 클라이언트 시각 렌더링** 검증에 집중.

### 5.1 사전 준비

- [ ] 테스트용 결재 문서 1건 작성 (양식: `GENERAL`, 승인자 2명 + 참조자 1명 구성).
- [ ] 모든 참여자 (기안자, 승인자×2, 참조자) 의 `user.email` 은 본인 도구로 수신 가능한 사내 메일주소.
- [ ] 별도 문서 1건 추가 (반려 시나리오용 — 회수 시나리오와 분리하기 위해 결재 라인은 위와 동일하되 새 문서).
- [ ] 또 다른 별도 문서 1건 추가 (회수 시나리오용).

### 5.2 5 시나리오 체크리스트

5종 이벤트 (Phase 29 NOTIF-01~05) 를 각 1회씩 트리거. 각 행의 모든 검증 항목 PASS 여부 박스 체크.

| # | 시나리오 | 트리거 액션 | 수신 대상 | 검증 항목 |
|---|----------|-------------|-----------|-----------|
| 1 | **상신** (DRAFT → SUBMITTED) | 기안자가 SUBMIT | 1번 승인자 | [ ] `[MiceSign]` prefix [ ] 한글 subject 깨지지 않음 (UTF-8) [ ] 본문 한글 정상 [ ] "문서 바로가기" 버튼이 `${APP_BASE_URL}/documents/{id}` 로 연결 [ ] From 도메인이 §1 IT 승인 도메인 |
| 2 | **중간 승인** (step N → step N+1) | 1번 승인자 APPROVE | 2번 승인자 | (1번과 동일 5항목) |
| 3 | **최종 승인** (last step → APPROVED) | 2번 승인자 APPROVE | 기안자 | (1번과 동일 5항목) + 본문에 "최종 승인" 또는 등가 한글 표현 |
| 4 | **반려** (any step REJECTED) | (별도 문서) 1번 승인자 REJECT | 기안자 | (1번과 동일 5항목) + 반려 사유 표시 |
| 5 | **회수** (SUBMITTED → WITHDRAWN) | (또 다른 별도 문서) 기안자 WITHDRAW | 미처리 승인자 | (1번과 동일 5항목) |

5 시나리오 모두 메일 수신 + 5항목 PASS 면 §5.3 SQL 검증으로 진행.

### 5.3 audit_log 스팟 검증 — NFR-03

각 시나리오 직후 다음 SQL 로 audit_log 중복 INSERT 없음 확인 (Phase 29 D-D6 의 `ApprovalServiceAuditTest` 자동 회귀의 운영 환경 manual confirmation):

```sql
SELECT action_type, COUNT(*) AS cnt
FROM audit_log
WHERE document_id = ?    -- 시나리오 별 문서 ID 치환
GROUP BY action_type
ORDER BY action_type;
```

기대: 각 `action_type` 의 `cnt = 1` (SMTP listener 가 audit INSERT 를 추가하지 않음을 확인).

`cnt >= 2` 발견 시 → Phase 29 D-D6 회귀로 의심. **즉시 release 보류** + Phase 29 통합 테스트 재실행:

```bash
cd backend && ./gradlew test --tests com.micesign.approval.ApprovalServiceAuditTest
```

자동 테스트도 실패하면 코드 결함 — issue tracker 에 등록 후 v1.2 release 일정 재조정.

### 5.4 notification_log 스팟 검증

```sql
SELECT event_type, recipient_id, status, COUNT(*) AS cnt
FROM notification_log
WHERE document_id = ?    -- 시나리오 별 문서 ID 치환
GROUP BY event_type, recipient_id, status
ORDER BY event_type, recipient_id;
```

기대:
- 모든 행 `status = SUCCESS` (PENDING / FAILED 행 없음).
- 각 `(event_type, recipient_id)` 조합 `cnt = 1` (NOTIF-04 dedup unique constraint).

`status = PENDING` 이 10분 이상 잔존하면 → §6.2 트러블슈팅으로.
`status = FAILED` 가 보이면 → `error_message` 컬럼 확인 + §6.2 / §6.3 절차로.

---

## §6. 트러블슈팅 + 주기적 점검

### 6.1 BaseUrlGuard 가 startup 을 실패시킴

**증상:** `journalctl -u micesign` 에 다음 같은 라인:

```
ERROR ... ApplicationReadyEvent: BaseUrlGuard ... IllegalStateException: app.base-url must not contain 'localhost' in prod profile
```

`systemctl status micesign` 은 `Active: failed (Result: exit-code)`.

**원인:** `/etc/micesign/.env.production` 의 `APP_BASE_URL` 이 미주입이거나 `localhost` 포함.

**조치:**

```bash
# 현재 값 확인 (값 자체는 secret 아님 — 도메인은 §1 에서 IT 승인됨)
sudo cat /etc/micesign/.env.production | grep APP_BASE_URL

# 사내 실 도메인으로 수정
sudo vi /etc/micesign/.env.production
#   예: APP_BASE_URL=https://micesign.사내도메인

# 재시작
sudo systemctl restart micesign

# §4.2 게이트 재실행
sudo journalctl -u micesign -n 200 --no-pager | grep 'app.base-url' | grep -v localhost
```

### 6.2 SMTP 발송이 PENDING 에서 진행 안 함 (10분 이상 잔존)

**증상:** `notification_log.status` 가 PENDING 으로 10분 이상 머무름. 메일이 수신자에게 도달 안 함.

**원인 후보:**
- SMTP 연결 실패 (네트워크 / IP allowlist 등록 누락).
- SMTP 인증 실패 (AUTH 사용 시).
- `@Async` 스레드 풀 고갈 (50인 환경에서 매우 드문 케이스).
- 서버 재시작으로 in-flight 작업 손실 (Phase 29 D-A1 PENDING-first 패턴의 부작용 — 의도된 trade-off).

**조치 1 — 최근 로그 확인:**

```bash
sudo journalctl -u micesign -n 500 --no-pager | grep -iE 'mail|smtp|notification|approvalemailsender'
```

`Connection refused` / `Authentication failed` / `Could not connect to SMTP host` 등 명확한 에러 메시지 우선 확인.

**조치 2 — Phase 29 D-A11 수동 FAILED 전환 SQL (인계):**

stale PENDING 은 자동 청소 cron 미도입 결정 (Phase 29 D-A11 — 50인 + 드문 서버 재시작 가정에서 cron 은 과스펙). 수동 전환:

```sql
-- 10분 이상 PENDING 행을 FAILED 로 전환 (수동 운영 — Phase 29 D-A11 인계)
UPDATE notification_log
SET status = 'FAILED',
    error_message = '[수동전환] 10분 이상 PENDING — 서버 재시작 또는 SMTP 장애 의심',
    updated_at = NOW()
WHERE status = 'PENDING'
  AND created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

전환 후:
1. SMTP 연결성 §4.3 재검증.
2. 근본 원인 (네트워크 / 인증) 해소되면 동일 문서를 재상신할지는 운영자 판단 (자동 재시도 큐 미도입 — D-B6).

**조치 3 — SMTP 연결 자체 실패면 §1 회귀:**

`telnet $MAIL_HOST $MAIL_PORT` 가 `Connection refused` 면 IT 측 IP allowlist 가 풀렸거나 메일 서버 점검 중. §1.1 의 IT 협의로 회귀.

### 6.3 주간 점검 — Phase 29 D-B6 인계 (운영자 push 알림 deferred 의 보완)

운영자 push 알림 파이프라인 (Slack/SMS/PagerDuty 자동 통보) 은 Phase 29 D-B6 에서 Phase 1-C / v2 로 deferred. 50인 규모에서는 주기적 수동 SQL 조회로 충분.

**매주 1회 (월요일 아침 권장) 다음 SQL 실행:**

```sql
-- 지난 7일 발송 실패 건수 (Phase 29 D-B6 인계)
SELECT event_type, COUNT(*) AS failed_cnt
FROM notification_log
WHERE status = 'FAILED'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY event_type
ORDER BY failed_cnt DESC;
```

**판독:**
- 모든 `failed_cnt = 0` → 정상. 다음 주까지 대기.
- 어떤 `event_type` 에서 `failed_cnt > 0` 발견 시:

```sql
-- 실패 원인 구분 (error_message 별 빈도)
SELECT error_message, COUNT(*) AS cnt
FROM notification_log
WHERE status = 'FAILED'
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY error_message
ORDER BY cnt DESC;
```

**조치 분기:**
1. **SMTP timeout / connection refused** — 일시적 사내 메일 서버 점검 가능성. IT 에 문의 + §4.3 재검증 + 다음 주 모니터.
2. **AUTH failure** — `MAIL_USERNAME` / `MAIL_PASSWORD` 만료 또는 변경. §2.1 으로 회귀 + IT 와 새 자격증명 협의.
3. **Template render error / 한글 인코딩 오류** — 코드 결함 의심. issue tracker 등록.
4. **`[수동전환] 10분 이상 PENDING`** — §6.2 의 수동 전환 흔적. 근본 원인이 1/2/3 중 무엇이었는지 logs 로 역추적.

### 6.4 NFR-01 (검색 95p ≤ 1초) 운영 모니터링 — Cross-reference

본 런북은 SMTP 운영에 집중. NFR-01 (검색 응답 95p ≤ 1초) 의 운영 모니터링은 별도 문서 책임:

- **참조:** [`.planning/milestones/v1.2/MONITORING.md`](./MONITORING.md) — Phase 33-03 산출물 (slow query log 활성화 절차 + 3 신호 발동 시 재실측 절차).
- **3 신호 (Plan 30-05 deferral 결정 계승, 본 phase D-S2):**
  1. 사용자 체감 검색 지연 신고 1건 이상.
  2. MariaDB slow query log 에 `/api/v1/documents/search` 백엔드 쿼리가 1초 초과로 1회 이상 기록.
  3. 동시 활성 사용자 30명 초과 시점 도달.
- **신호 발동 시:** `MONITORING.md` 의 재실측 절차 (= `SearchBenchmarkSeeder` + `bench-search.sh` 재활용).

본 런북의 트러블슈팅 절차는 SMTP / startup / notification_log 로 한정 — 검색 성능 이슈는 위 cross-reference 로 위임.

---

## §7. 변경 이력 + 출시 게이트 체크리스트

### 7.1 변경 이력

| 일자 | 변경 | 작성자 |
|------|------|--------|
| 2026-04-28 | v1.2 초판 (Phase 33-02 D-M2) | (출시 담당) |

### 7.2 출시 게이트 (`.planning/milestones/v1.2/AUDIT.md` 의 source)

본 런북의 다음 단계가 모두 PASS 했는지가 v1.2 출시 게이트의 source:

- [ ] §1.1 사내 IT 협의 4항목 회신 완료
- [ ] §2.2 `stat` 출력이 `600 micesign:micesign`
- [ ] §3.3 `systemctl show -p EnvironmentFiles` 가 `/etc/micesign/.env.production` 출력
- [ ] §4.2 BaseUrlGuard 게이트 1 + 게이트 2 모두 PASS
- [ ] §4.3 `telnet` 또는 `nc` SMTP 핸드셰이크 PASS
- [ ] §5.2 5 시나리오 × 5 검증항목 모두 PASS
- [ ] §5.3 audit_log SQL 모든 시나리오에서 cnt=1
- [ ] §5.4 notification_log SQL 모든 시나리오에서 status=SUCCESS, cnt=1

위 항목들은 33-04 AUDIT.md 의 출시 게이트 체크리스트로 그대로 인용.

---

*문서 끝. 본 런북은 출시 전 §1-5 순차 수행 + 출시 후 §6 주간 점검 사이클로 운영. 사내 IT 와 §1 만 발췌하여 공유.*

