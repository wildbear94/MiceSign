# Phase 35: 백엔드 로그 설정 - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Inline shortcut from `/gsd-plan-phase 35` Q&A (replaces `/gsd-discuss-phase`)

<domain>
## Phase Boundary

Spring Boot 백엔드의 로깅 인프라를 운영 배포 가능 수준으로 정립한다. 사용자 요구 4가지: (1) **일별 롤링**, (2) **최대 30일 보관**, (3) **운영(prod)=INFO 만**, (4) **개발(dev)=전체 로그**. logback-spring.xml 신규 작성 없이 Spring Boot 의 `logging.*` properties + `logging.logback.rollingpolicy.*` 만으로 구현 (RFC: Spring Boot 3.x 표준). 로그 파일은 `${LOG_DIR:-logs}/micesign.log` env-var overridable, gzip 압축, 디스크 안전망 1GB total-size-cap.

scope-out: logback-spring.xml 신규 작성 / 외부 로그 집계 (ELK, Loki) / structured logging (JSON 포맷) / Sentry 같은 에러 트래커 / log shipping / 영문 i18n / DB 로그 테이블
</domain>

<decisions>
## Implementation Decisions

### A. 구현 방식 (Q1=a)

- **D-A1:** Spring Boot 3.x 의 `logging.*` properties + `logging.logback.rollingpolicy.*` 만 사용. **logback-spring.xml 신규 작성 안 함** — 요구사항 4가지가 모두 application.yml 만으로 충족 가능. 더 세밀한 어펜더 분기 (예: 콘솔 분리, JSON 포맷) 가 향후 필요해지면 별도 phase 로 이관.
- **D-A2:** Profile-based 분기 = `application-{profile}.yml` 의 `logging.level.root` override. base `application.yml` 은 root=INFO (운영 기본값과 동일).

### B. 로그 파일 경로 (Q2=b)

- **D-B1:** `logging.file.name: ${LOG_DIR:-logs}/micesign.log` (base `application.yml`)
  - dev/local: `logs/micesign.log` (프로젝트 루트 상대경로)
  - prod: `LOG_DIR=/var/log/micesign` 같이 systemd EnvironmentFile 또는 `application-prod.yml.example` 에 명시 → 별도 path 권장
- **D-B2:** `.gitignore` 에 `backend/logs/` 추가 (개발 환경에서 로컬 로그 파일 git tracking 방지)
- **D-B3:** prod 환경의 `LOG_DIR` 디렉터리 사전 생성 + 권한 (chown app-user, chmod 750) 은 systemd unit / 운영 deploy 절차에 명시 — 코드 변경 외부

### C. 일별 롤링 + 30일 보관 (사용자 명시)

- **D-C1:** `logging.logback.rollingpolicy.file-name-pattern: ${LOG_DIR:-logs}/micesign-%d{yyyy-MM-dd}.%i.log.gz`
  - `%d{yyyy-MM-dd}`: 일별 날짜
  - `%i`: 동일 일자 내 size-cap 도달 시 인덱스 (안전망)
  - `.gz` 확장자: Spring Boot 가 자동 gzip 압축 (Q4=gzip)
- **D-C2:** `logging.logback.rollingpolicy.max-history: 30` — 30일 초과 파일 자동 삭제
- **D-C3:** `logging.logback.rollingpolicy.max-file-size: 100MB` — 단일 파일 최대 (안전망 보조 — 폭주 시 같은 일자에 .1, .2 인덱스 생성)
- **D-C4:** `logging.logback.rollingpolicy.total-size-cap: 1GB` — 전체 로그 디렉터리 디스크 사용 상한 (Q5=1GB). 50인 환경 + 30일 보관에 안전 마진 충분
- **D-C5:** `logging.logback.rollingpolicy.clean-history-on-start: true` — 앱 재시작 시 max-history 초과 파일 즉시 삭제 (서버 재기동 후 정합성 보장)

### D. 레벨 분리 (사용자 명시)

- **D-D1:** **base `application.yml`** — `logging.level.root: INFO` (운영 기본값)
- **D-D2:** **`application-prod.yml`** — 변경 없음 (root 가 base 의 INFO 상속). 기존 `logging.level.com.micesign: INFO` 도 유지 (root=INFO 와 redundant 이지만 의도 명시 — Phase 33 D-C1 와 일관성)
- **D-D3:** **`application-dev.yml`** — `logging.level.root: DEBUG` 추가 (Q3 채택). 기존 `logging.level.com.micesign: DEBUG, org.hibernate.SQL: DEBUG` 유지 (redundant 이지만 명시)
- **D-D4:** **`application-bench.yml`** — 본 phase 무수정 (Phase 30 의 검색 벤치마크 환경, 로깅은 부수적). 향후 필요 시 별도 phase
- **D-D5:** TRACE 는 default 미설정 — 필요 시 개별 패키지 한정 (`logging.level.org.springframework.security: TRACE` 등) 으로 임시 활성화

### E. 로그 패턴 (선택적 보강)

- **D-E1:** `logging.pattern.file` 명시 — Spring Boot 기본 사용. 향후 structured logging (JSON) 또는 trace-id 추가 필요 시 별도 phase. 본 phase 는 default 유지.
- **D-E2:** `logging.charset.file: UTF-8` — 한글 로그 메시지 깨짐 방지

### F. 검증 (Nyquist)

- **D-F1:** 자동 검증 — `./gradlew bootRun --args='--spring.profiles.active=dev'` 부팅 후 로그 파일 존재 확인 (curl/grep)
- **D-F2:** 단위 테스트 — Spring Boot logging 자체는 단위 테스트 대상 아님 (프레임워크 책임). `application*.yml` 의 yaml 문법 검증은 `./gradlew test --tests *.MicesignApplicationTests`(컨텍스트 로딩 smoke test) 가 자동 수행.
- **D-F3:** 수동 UAT 4 시나리오:
  1. dev 프로필 부팅 → `logs/micesign.log` 파일 생성 확인 + DEBUG 라인 포함
  2. prod 프로필 부팅 → 동일 경로 파일 생성 + DEBUG 라인 부재 (INFO 만)
  3. (문서로 인계, 실측 안 함) 30일 후 `clean-history-on-start: true` 가 30일 이전 파일 삭제 — 운영 모니터링 단계에서 확인
  4. (문서로 인계) total-size-cap=1GB 도달 시 가장 오래된 파일부터 삭제 — 50인 환경에서는 30일 max-history 가 먼저 트리거되므로 fallback 로직

### G. Backward-compat & 회귀

- **D-G1:** Phase 33 의 `application-prod.yml` 자격증명 위생 변경 무영향 — 본 phase 는 logging block 만 추가 (datasource/mail/jwt 등 무수정).
- **D-G2:** 모든 결재 흐름/SMTP 알림/대시보드/검색 등 기존 기능 무영향 — logging 은 cross-cutting 이지만 runtime 성능 영향 미미 (Tomcat thread blocking 없음).
- **D-G3:** 기존 SMTP 운영 런북 (`.planning/milestones/v1.2/SMTP-RUNBOOK.md`) 의 systemd EnvironmentFile 절차에 `LOG_DIR=/var/log/micesign` 추가 권장 — Phase 35 산출물 인계 메모로 기록 (런북 직접 수정은 별도 phase 또는 출시 시점)

### Claude's Discretion

- 로그 파일 이름 prefix (`micesign.log` vs `app.log` vs `application.log`) — 프로젝트명 일치 우선 → `micesign.log` 채택
- yml 키 작성 순서 — Spring Boot 기존 컨벤션 따름
- `application.yml` 내 logging 블록 위치 (top-level vs 어디 사이에) — `spring:` 블록 이후, `jwt:` 블록 이전이 자연스러움
</decisions>

<canonical_refs>
## Canonical References

### 백엔드 — 영향 파일

- `backend/src/main/resources/application.yml` — base config, logging block 신규 추가
- `backend/src/main/resources/application-dev.yml` — `logging.level.root: DEBUG` 추가
- `backend/src/main/resources/application-prod.yml` — 변경 없음 (root=INFO 는 base 상속) — 단 의도 명시 위해 root 키 추가도 옵션
- `backend/src/main/resources/application-prod.yml.example` — `LOG_DIR` env var 카탈로그 추가 권장 (Phase 33 D-C1 와 일관성)
- `backend/src/main/resources/application-bench.yml` — 무변경 (D-D4)

### 프로젝트 루트

- `.gitignore` — `backend/logs/` 추가 (D-B2)

### 운영 인계 (코드 외)

- `.planning/milestones/v1.2/SMTP-RUNBOOK.md` (Phase 33 산출물) — `LOG_DIR=/var/log/micesign` env var 명시는 출시 시점 운영 절차에 추가 (코드 무변경)
- 운영 systemd unit + EnvironmentFile + chown/chmod — 별도 운영 절차 (코드 무변경)

### Spring Boot 3.x 공식 reference

- Spring Boot Reference: `spring-boot.logging.logback.rollingpolicy` properties (file-name-pattern, max-history, max-file-size, total-size-cap, clean-history-on-start)
- `logging.file.name` vs `logging.file.path`: name 사용 (전체 경로 명시), path 는 디렉터리만
</canonical_refs>

<specifics>
## Specific Ideas

- 사용자 요구 원문: "백엔드 로그 설정 해줘 최대 30일 까지 보관하고 일별로 로그가 남기고 운영계는 info 로그만 개발계는 전체 로그가 남도록 해줘"
- 4 요구사항 1:1 매핑:
  - "최대 30일 보관" → `max-history: 30` (D-C2)
  - "일별로 로그" → `file-name-pattern` 의 `%d{yyyy-MM-dd}` (D-C1)
  - "운영계는 info 로그만" → `application-prod.yml` 의 root 가 INFO (D-D2 — base 상속)
  - "개발계는 전체 로그" → `application-dev.yml` 의 `logging.level.root: DEBUG` (D-D3)
- 추가 자동 결정 (사용자 ok): gzip 압축, env-var path, 1GB total-size-cap, clean-history-on-start
</specifics>

<deferred>
## Deferred Ideas

- logback-spring.xml 신규 작성 (어펜더 세밀 제어, JSON 포맷, MDC trace-id 등) — 별도 phase
- 외부 로그 집계 (ELK / Grafana Loki / CloudWatch) — 별도 phase 또는 별도 milestone
- structured logging (JSON 포맷, MDC trace-id 자동 주입) — 별도 phase
- Sentry / Bugsnag 같은 에러 트래커 통합 — 별도 phase
- 로그 알림 (e.g. ERROR 레벨 발생 시 Slack/이메일) — 별도 phase
- application-bench.yml logging 정책 — 본 phase 무수정 (Phase 30 검색 벤치 환경)
- 로그 보존 기간 정책 (30일 → 7일/90일 등 변경) — 운영 모니터링 후 별도 phase
- DB 로그 테이블 (audit_log 와 별개) — 별도 phase
- TRACE 레벨 토글 UI — 별도 phase
</deferred>

---

*Phase: 35-backend-logging*
*Context gathered: 2026-04-29 via inline shortcut from /gsd-plan-phase Q&A*
