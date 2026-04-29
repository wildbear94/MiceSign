# Phase 35 — 백엔드 로그 설정: HUMAN UAT 체크리스트

**Phase:** 35-backend-logging
**Plan:** 35-01
**Status:** APPROVED
**Staged:** 2026-04-29
**Signed off:** 2026-04-29 by park sang young (project owner) — decision: approved (7/7 gates PASS)
**Plan task ref:** Task 3 (`type="checkpoint:human-verify"`, gate=blocking)

---

## 배경

Phase 35 의 4-파일 config 변경 (Task 1+2) 이 실제 부팅 시에도 의도한 대로 동작하는지 dev/prod 양쪽 프로필로 smoke 검증한다. Spring Boot logging 자체는 단위 테스트 대상이 아니므로 (D-F2) 부팅 후 로그 파일 존재 + 레벨 분리 동작을 grep 으로 확인하는 게 유일한 검증 경로.

**Task 1+2 자동 검증 결과 (이미 PASS):**

- `./gradlew compileJava` PASS — yml 파싱 오류 없음
- 6 핵심 logging 키 (file.name / charset.file / level.root / file-name-pattern / max-history / total-size-cap / clean-history-on-start) 모두 application.yml 에 명시
- application-dev.yml `root: DEBUG` 추가 확인
- application-prod.yml.example `# LOG_DIR=/var/log/micesign` 카탈로그 추가 확인
- .gitignore `backend/logs/` 추가 확인
- application-prod.yml / application-bench.yml 무수정 확인 (D-D2/D-D4)

---

## 시나리오 1: dev 프로필 부팅 — root=DEBUG 동작 확인

### 1-A. 기존 로그 정리

```bash
cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign/backend
rm -rf logs/
```

### 1-B. dev 프로필 부팅 (백그라운드, 30초 후 자동 종료)

```bash
./gradlew bootRun --args='--spring.profiles.active=dev' &
GRADLE_PID=$!
sleep 30
kill $GRADLE_PID 2>/dev/null
wait $GRADLE_PID 2>/dev/null
```

(또는 IDE 에서 dev profile 로 부팅 후 30초 후 stop)

### 1-C. 검증 — 4 게이트

- [ ] **로그 파일 존재** — `ls -la logs/micesign.log` → 파일 존재 + size > 0
- [ ] **DEBUG 라인 ≥1** — `grep -E "DEBUG.*(org\.hibernate\.SQL|com\.micesign)" logs/micesign.log | head -3` → 최소 1줄 매치
- [ ] **UTF-8 인코딩** — `file logs/micesign.log` → 'UTF-8' 또는 'ASCII' 포함 (binary/Latin-1 아님)
- [ ] **gitignore 차단 동작** — `git status backend/logs/` → untracked 출력 없음

---

## 시나리오 2: prod 프로필 부팅 — root=INFO (DEBUG 부재) + LOG_DIR override 동작 확인

### 2-A. 로그 정리 + LOG_DIR 임시 디렉터리 준비

```bash
cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign/backend
rm -rf logs/ /tmp/micesign-prod-test-logs
mkdir -p /tmp/micesign-prod-test-logs
```

### 2-B. prod 프로필 부팅 (필수 env var 임시 주입 + LOG_DIR override)

```bash
LOG_DIR=/tmp/micesign-prod-test-logs \
DB_USER=p30 DB_PASS=wild0235! \
APP_BASE_URL=https://micesign.example.com \
./gradlew bootRun --args='--spring.profiles.active=prod' &
GRADLE_PID=$!
sleep 30
kill $GRADLE_PID 2>/dev/null
wait $GRADLE_PID 2>/dev/null
```

**주의:** BaseUrlGuard 가 localhost 거부 (Phase 29 D-D2) — example.com 사용. 실 운영 도메인 아니어도 부팅만 통과하면 OK.

### 2-C. 검증 — 3 게이트

- [ ] **로그 파일 존재** — `ls -la /tmp/micesign-prod-test-logs/micesign.log` → 파일 존재 + size > 0
- [ ] **DEBUG 라인 부재 (가장 핵심)** — `grep -c "DEBUG" /tmp/micesign-prod-test-logs/micesign.log` → `0` 출력 (root=INFO 상속이 정상 동작)
- [ ] **INFO 라인 존재** — `grep -c "INFO" /tmp/micesign-prod-test-logs/micesign.log` → 양수 (Spring Boot startup INFO 다수)

### 2-D. 정리

```bash
rm -rf /tmp/micesign-prod-test-logs
```

---

## 시나리오 3·4 (문서 인계 — 실측 안 함, D-F3 #3·#4)

- **30일 후 max-history 자동 삭제** — 운영 모니터링 단계에서 30일 도래 시점에 1회 확인 (코드 검증 불가)
- **total-size-cap=1GB fallback** — 50인 환경에서는 max-history (30일) 가 먼저 트리거되므로 실측 가능성 낮음
- 두 항목은 SUMMARY.md 의 Deferred 인계 메모로만 기록됨

---

## Sign-off

7 게이트 (시나리오 1: 4개 + 시나리오 2: 3개) 모두 PASS 시 다음 메시지로 응답:

```
approved
```

문제 발견 시:
- 어떤 시나리오의 어떤 게이트가 실패했는지 명시
- 명령 출력 (특히 grep 결과) 공유
- 부팅 로그 stderr 공유

---

## 참고 — 자동 verify 명령 (시나리오 1 단축)

시나리오 1 만 빠르게 자동 검증:

```bash
cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign && \
  [ -f backend/logs/micesign.log ] && \
  grep -E "DEBUG.*(org\.hibernate\.SQL|com\.micesign)" backend/logs/micesign.log | head -1 | grep -q DEBUG && \
  [ -z "$(git status --porcelain backend/logs/ 2>/dev/null)" ] && \
  echo "DEV PROFILE SMOKE PASS"
```

---

*Phase 35-01 HUMAN-UAT staged 2026-04-29 — APPROVED 2026-04-29 by park sang young (project owner), all 7 gates PASS*
