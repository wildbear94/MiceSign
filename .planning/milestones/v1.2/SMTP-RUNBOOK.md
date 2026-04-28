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
