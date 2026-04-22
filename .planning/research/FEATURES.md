# Feature Landscape

**Domain:** Electronic Approval System — v1.2 Phase 1-B (일상 업무 대체 수준)
**Researched:** 2026-04-22
**Confidence:** HIGH (PRD/FSD already define most behaviors explicitly; market research confirms scope is appropriate)

## Scope of This Research

Phase 1-B brings the already-shipped MVP (Phase 1-A + v1.1 builder) to "daily-use replacement" quality. Four feature areas in scope:

1. **SMTP 이메일 알림** — 5 event types (상신 / 중간승인 / 최종승인 / 반려 / 회수)
2. **문서 검색 / 필터링** — 복합 필터 + 키워드 검색, 열람 권한 적용
3. **대시보드 고도화** — 위젯, 최근 문서, 내 결재 대기
4. **양식 확장** — 추가 기본 양식 또는 CUSTOM 빌더 기반 프리셋 확충

Everything in this document assumes 50-user internal tool scale. Enterprise-scale features (delegation, parallel approval, multi-channel, escalation) are explicitly deferred.

---

## Existing Foundation (What v1.2 Can Depend On)

| Capability | Source | How v1.2 Uses It |
|------------|--------|------------------|
| `user.email` (unique, NOT NULL) | v1.0 DDL | SMTP recipient resolution — no new field needed |
| `notification_log` 테이블 (DDL 이미 정의) | v1.0 DDL | 발송 이력 기록 대상 테이블 — 생성만 하면 됨 |
| `@TransactionalEventListener` 이벤트 구조 | PRD §9.2 명시 | 승인/반려 서비스에서 이벤트 발행 → 비동기 메일 |
| 문서 상태 전이 훅 (APR-03/04/05) | v1.0 서비스 계층 | 상신/승인/반려/회수 전이 지점에 이벤트 발행 |
| `document` 인덱스 (`idx_status`, `idx_submitted_at`, `idx_template_code`, `idx_drafter_status`) | v1.0 DDL | 검색 필터 — 인덱스가 이미 필터 컬럼 모두 커버 |
| 열람 권한 정책 (PRD §7.3) | 문서화 완료 | 검색 WHERE 절에 그대로 적용 (FSD §11 예시 SQL 존재) |
| QueryDSL 5.1.0 설정 | Phase 1 | 동적 복합 필터 쿼리 빌드 |
| 대시보드 요약 API `/api/dashboard` (DASH-01/02/03) | v1.0 | 위젯 카운트는 이미 반환 — 고도화는 `recentApprovals` 추가 등 소폭 확장 |
| TanStack Query v5 | 프론트 | 검색/필터 캐싱, 페이지네이션, 디바운스 훅 기반 |
| `approval_template.code` + `prefix` + `is_active` | v1.0 DDL | 양식 확장 시 DB 레코드만 추가하면 CUSTOM 렌더러가 처리 (v1.1) |
| CUSTOM 동적 폼 렌더러 (Phase 24.1) | v1.1 | 추가 양식을 하드코딩 없이 CUSTOM 스키마로 제공 가능 |

**핵심 함의:** v1.0 단계에서 인프라가 이미 설계되어 있어, v1.2는 대부분 **채워넣기(wiring)** 작업이다. 새 테이블은 0개 (notification_log는 DDL만 있음, v1.2에서 실제 사용).

---

## Table Stakes

**정의:** 50명 내부 시스템이라도 이게 없으면 "일상 업무 대체"라고 부를 수 없는 기능. 사용자는 있다고 가정한다.

### A. SMTP 이메일 알림

| # | Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---------|--------------|------------|----------------------|
| A1 | **5종 이벤트 메일 발송** (상신 / 중간 승인 / 최종 승인 / 반려 / 회수) | PRD §9.1 / FSD FN-NTF-001에 이미 명시. 전자결재의 핵심 가치가 "내 순서를 놓치지 않는 것" — 이메일 없으면 결재대기함을 사람이 수동으로 폴링해야 함 | MEDIUM | 이벤트 발행 지점: 상신(DOC-03), 승인(APR-03)의 "다음 순서 이동" / "최종 승인" 분기, 반려(APR-04), 회수(DOC-05). `@TransactionalEventListener(AFTER_COMMIT)` — 커밋 전 발송 금지 (이벤트 기준 트랜잭션 롤백 시 메일 오발송) |
| A2 | **문서 직링크 포함** | 메일 본문에 `/documents/{id}` 링크. "어떤 문서?"를 찾아들어가는 마찰 제거 — 이것 하나로 처리 속도 체감이 바뀜 | LOW | `app.base-url` 환경 변수 1개 추가. 프로드/개발 환경 분리 |
| A3 | **HTML + Plain Text 듀얼 포맷** | 최신 메일 클라이언트 표준. Plain text fallback이 없으면 일부 사내 메일 시스템이 스팸 처리 | LOW | Thymeleaf 또는 단순 String 템플릿. Spring `MimeMessageHelper` 기본 지원 |
| A4 | **발송 실패 재시도 2회 (5분 간격)** | PRD §9.2 / FSD FN-NTF-001 명시. 일시적 SMTP 장애(TLS 핸드셰이크, 레이트 리밋)는 재시도로 복구 | LOW | Spring Retry(`@Retryable`) 또는 스케줄러로 `notification_log.status=RETRY` 레코드 재처리. 지수 백오프 대신 고정 5분 (PRD 규정) |
| A5 | **notification_log 기록 (성공/실패/재시도)** | PRD §9.2 명시. "메일 못 받았다" 민원 시 관리자가 이력 확인 필수. 불변 기록 원칙 (audit와 동일 맥락) | LOW | INSERT만; UPDATE는 status/retry_count/sent_at/error_message에 한정. 삭제 불가 정책 |
| A6 | **수신자 이메일 비어있거나 비활성 계정 스킵** | `user.email`은 NOT NULL이지만 `user.status = RETIRED/INACTIVE`인 사용자에게 발송하면 스팸 반송. 퇴직자 결재선 건 (ORG-009)과 맞물림 | LOW | 이벤트 핸들러에서 `status = 'ACTIVE'`만 대상. 비활성 수신자는 log에 `SKIPPED` (새 enum 값) 또는 FAILED + error_message="INACTIVE_USER" |
| A7 | **메일 제목에 `[MiceSign]` 접두사** | 사내 사용자 메일함 필터링/검색 편의. 스팸 판정 완화 (일관된 발신자 이름 + 제목 prefix) | LOW | 템플릿에 하드코딩 |

### B. 문서 검색 / 필터링

| # | Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---------|--------------|------------|----------------------|
| B1 | **키워드 검색 (제목 + 문서번호)** | 매일 쓰는 기능. "저번주 상신한 그 지출결의서" → 제목 일부만 기억. LIKE `%keyword%` 허용 (50명 규모에서는 문제없음) | LOW | `document.title` / `doc_number` LIKE 검색. 기존 인덱스로 충분 (문서 10K건까지는 full scan도 허용 수준) |
| B2 | **상태 필터 (복수 선택)** | 상태 뱃지로 바로 분류하는 것이 기본. "내 진행중 문서만", "반려된 것만" | LOW | `status IN (...)`. FSD `status=SUBMITTED,REJECTED` 형식으로 CSV 파라미터 수용 |
| B3 | **양식 필터** | "지출결의만", "휴가신청만" — 월말 정산 때 필수 | LOW | `template_code = :code`. 단일 선택으로 시작 |
| B4 | **기간 필터 (상신일 기준, 시작일/종료일)** | "이번 달 결재 내역", "분기별 집계" — 경영/회계에서 반복되는 요구 | LOW | `submitted_at BETWEEN :start AND :end`. 기본 범위 preset 버튼 (오늘/이번주/이번달/최근 3개월) 권장 |
| B5 | **기안자 필터 (본인/다른 사람)** | ADMIN이 부서원 문서 확인할 때 "김과장이 쓴 것만" 드릴다운. 일반 USER는 본인 = 내 문서함 | LOW | `drafter_id = :id`. 조직 트리 모달(기존 결재선 편집기 재사용) 또는 자동완성 |
| B6 | **열람 권한 WHERE 필터 (자동 적용)** | PRD §7.3 / FSD §11에 SQL 명세. 검색 결과에 열람 권한 없는 문서가 노출되면 **보안 사고**. 표시만 막는 게 아니라 쿼리 자체가 필터링해야 함 | MEDIUM | 4가지 OR 분기: (1) drafter 본인, (2) approval_line 포함, (3) ADMIN + 부서원, (4) SUPER_ADMIN. `drafter_id IN (부서원 ID 서브쿼리)` 또는 `EXISTS` — QueryDSL로 동적 구성 |
| B7 | **타인의 DRAFT 제외** | FSD §11 명시. 임시저장은 개인 작업 공간 — 검색에 노출되면 프라이버시 문제 | LOW | `WHERE status != 'DRAFT' OR drafter_id = :me` |
| B8 | **페이지네이션 (기본 20건)** | 결과가 많을 때 성능/UX — 테이블 형 결과 페이지의 표준 | LOW | `page`, `size` 파라미터. TanStack Query `useInfiniteQuery` 또는 숫자 페이저 |
| B9 | **응답 시간 ≤ 1초 (PRD NFR 14.1)** | 검색이 느리면 안 씀. 50명 × 50 req/min 피크 상정 | LOW | 기존 인덱스로 달성. EXPLAIN 로컬 검증만 하면 됨 |
| B10 | **필터 URL 동기화 (쿼리스트링)** | 검색 결과 공유/북마크, 브라우저 뒤로가기 자연스러움 | LOW | React Router `useSearchParams`. Zustand에 중복 저장하지 않는 것이 정답 |

### C. 대시보드 고도화

| # | Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---------|--------------|------------|----------------------|
| C1 | **결재 대기 건수 위젯 (숫자 + 바로가기)** | v1.0에서 이미 구현됨 (DASH-03). "대기 3건" → 클릭하면 `/approvals/pending`. 재확인/UI 정리 | LOW (이미 있음) | 기존 API 유지. UI만 카드형으로 리디자인 |
| C2 | **내 결재 대기 최근 5건 미리보기** | 대시보드 열자마자 "뭘 처리해야 하지?"가 나와야 함. 건수만 있으면 클릭 한번 더 필요 | LOW | `/api/dashboard`에 `recentApprovals` 배열 추가 (FSD §10에 이미 스펙). 5건 제한, submitted_at desc |
| C3 | **내 최근 기안 문서 5건** | "내가 쓴 그 문서 어디 갔지?" 해결. 내 문서함 들어가지 않고도 상태 확인 | LOW | 기존 `recentDocuments` 그대로 사용 (이미 스펙 존재) |
| C4 | **기안 진행중 / 임시저장 카운트** | DASH-03 이미 존재. Phase 1-B에서는 재디자인만 | LOW (이미 있음) | 카드 레이아웃 조정 |
| C5 | **빠른 작성 버튼 (양식별 바로가기)** | FSD §10 명시. 반복 기안(휴가, 지출)을 한번 클릭으로 시작 | LOW | `TEMPLATE_REGISTRY`에서 active 양식 나열. 이모지/아이콘 한 개씩 |
| C6 | **위젯 로딩 상태 / 빈 상태 처리** | "결재 대기 없음 🎉" 같은 긍정 메시지 — 텅 빈 화면 방지 | LOW | TanStack Query `isLoading` / `data.length === 0` 조건부 렌더 |

### D. 양식 확장

| # | Feature | Why Expected | Complexity | Dependencies / Notes |
|---|---------|--------------|------------|----------------------|
| D1 | **구매 요청서 (PURCHASE) 양식** | PRD §5 언급, FSD Phase 1-B 리스트 (TPL-04). 지출결의와 별개 — 사전 구매 승인용 (품목, 수량, 예상금액, 구매처, 사유) | MEDIUM | **권장: CUSTOM 스키마로 seed** — v1.1 builder 덕분에 하드코딩 컴포넌트 불필요. approval_template INSERT + 기본 SchemaDefinition JSON 1개만 |
| D2 | **출장 보고서 (BUSINESS_TRIP) 양식** | TPL-05. 출장지/기간/목적/일정/경비 — 대부분 회사에서 쓰는 기본 양식 | MEDIUM | D1과 동일 전략 (CUSTOM 스키마 seed) |
| D3 | **연장 근무 신청서 (OVERTIME) 양식** | TPL-06. 일자/시작-종료 시각/사유/대체휴가 여부 — 근로기준법 대응으로 필요 | MEDIUM | D1과 동일 |
| D4 | **프리셋 카탈로그 UI (관리자)** | v1.1 CNV-04에서 프리셋 버튼 존재. v1.2는 프리셋 3종(D1-D3) 추가 + UI에서 "추천 템플릿" 섹션 | LOW | v1.1 Preset 시스템에 JSON 3개 추가 |

---

## Differentiators

**정의:** 50명 내부 도구에서 "오, 이거 편하네"로 평가받을 만한 기능. 없어도 업무는 되지만 있으면 내부 만족도가 크게 올라감.

| # | Feature | Value Proposition | Complexity | Dependencies / Notes |
|---|---------|-------------------|------------|----------------------|
| E1 | **중간 승인자도 앞 승인자 comment 메일에 포함** | "박부장이 뭐라고 쓰고 넘겼지?" 확인하러 다시 시스템 안 들어가도 됨. 컨텍스트 전달 품질 | LOW | 이벤트 페이로드에 직전 `approval_line.comment` 포함 |
| E2 | **메일 본문 요약 카드 (양식별)** | 지출결의라면 "합계 250,000원", 휴가라면 "연차 3일 (4/25~4/29)" — 메일만 보고도 결재 결정 가능 | MEDIUM | 양식 코드별 분기 로직. v1.1 `executeCalculations` 결과 재사용 |
| E3 | **검색 프리셋 / 최근 검색** | "진행중인 내 문서", "이번달 승인완료" 같은 자주 쓰는 쿼리를 1클릭. URL 북마크가 이미 있으므로 우선순위는 낮음 | LOW | Zustand에 최근 5개 필터 저장 (localStorage persist). 프리셋은 하드코딩 3-4개 |
| E4 | **대시보드 "오래 대기 중" 경고 배지** | 내 순서에서 3일 이상 멈춘 결재를 강조 → 놓침 방지. 사내 결재 속도 개선 | LOW | `pending_since > NOW() - 3 DAYS` 조건부 스타일 |
| E5 | **알림 설정(사용자별 on/off) 간단 토글** | 휴가 중 메일 폭탄 방지, 알림 피로도 대응. 5종 이벤트 각각은 과함 → **전체 on/off 1개 토글로 충분** | LOW | `user.email_notifications BOOLEAN DEFAULT TRUE` 컬럼 1개. 설정 페이지 체크박스 |
| E6 | **문서번호 직접 검색 (F3/단축키)** | 문서번호 암기형 사용자가 빠르게 점프. 글로벌 서치바 컴포넌트 | LOW | 헤더 검색 인풋. 엔터 시 `/documents/search?keyword=<숫자>` 이동 |
| E7 | **"내 결재 대기" 대시보드 위젯을 홈페이지 고정** | 로그인 후 바로 액션 가능. v1.0 DASH-01과 겹치지만 UX 강조 | LOW | C2와 결합 |
| E8 | **CSV 내보내기 (검색 결과)** | 경영/회계 월말 집계 시 엑셀로 가공 필요. Phase 1-C 통계 기능 도착 전 임시 대안 | LOW | `/api/documents/search?format=csv`. OpenCSV 또는 String builder. 권한 필터 동일 적용 |
| E9 | **메일 템플릿 로고/브랜딩** | HTML 메일에 MiceSign 로고 + 푸터. 내부 신뢰도 ↑, 스팸 판정 ↓ | LOW | 정적 이미지 CID 또는 외부 URL |

---

## Anti-Features

**정의:** 이것을 원한다고 누군가 말할 수 있지만, 50명 내부 도구 스케일에서는 명확히 "짓지 말 것."

| # | Anti-Feature | Why Requested | Why Problematic | Alternative |
|---|--------------|---------------|-----------------|-------------|
| X1 | **멀티채널 알림 (Slack / 카톡 / SMS)** | "슬랙 쓰는데 슬랙으로 받고 싶다" — 개별 사용자의 선호 | 채널별 어댑터, 인증, 메시지 포맷 재정의, 재시도 로직 × N. 채널 죽으면 fallback 복잡도. 50명 규모에서 이메일이 보편 가능 | Phase 2 이후 — Webhook 1종만 (Slack incoming webhook URL을 사용자 프로필에 저장) |
| X2 | **WebSocket/SSE 실시간 인앱 알림** | "브라우저 열어둔 동안 즉시 알림 띄우고 싶다" | 연결 관리, 스케일링(백엔드에 상태), 재연결 로직, SSL/프록시 이슈. Spring Stateless 아키텍처와 상충. 이메일 + 대시보드 폴링으로 충분 | 대시보드를 5분마다 TanStack Query `refetchInterval`로 자동 새로고침 — 체감상 유사 |
| X3 | **알림 에스컬레이션 (N시간 미처리 시 상급자에게)** | "결재가 멈춰있으면 부장한테도 알려라" | 조직도 기반 계층 탐색 로직, 반복 cron 스케줄러, 에스컬레이션 규칙 UI. PRD §6.1 "100% 자율 결재선" 원칙과 충돌 | 대시보드 "오래 대기" 배지(E4) + 관리자 수동 개입으로 해결 |
| X4 | **복수 시간대 / 다국어 메일** | 해외법인/지사 대응 기대 | 타임존 처리, i18n 템플릿, locale 결정 로직. 50명 내부 한국어 단일 환경 | Asia/Seoul 하드코딩, 한국어 단일 템플릿 |
| X5 | **정규식 / 고급 불린 검색 (AND/OR/NOT 파서)** | "파워 유저를 위한 고급 검색" | 쿼리 파서 구현, SQL 인젝션 위험, 학습 곡선. 50명 규모에서 실제로 쓰는 사람 없음 | 복합 필터(B2-B5)만으로 99% 커버. 검색은 간단해야 신뢰 |
| X6 | **전문 검색 엔진 (Elasticsearch / OpenSearch)** | "전문 검색을 제대로 하려면…" | 별도 인프라, 색인 동기화, 장애 대응, 운영 복잡도. 문서 총량 10K건 이하 예상. MariaDB LIKE로 < 1초 달성 가능 | MariaDB `FULLTEXT INDEX` (MariaDB 10.11 지원)는 **본문(HTML)** 검색이 필요해질 때만 고려. Phase 1-B는 제목/번호만 |
| X7 | **사용자별 대시보드 커스터마이징 (위젯 배치, 숨김)** | "내 화면은 내 맘대로" | 설정 DB, 드래그&드롭 UI, 기본값 관리, 브레이킹 체인지 난이도. 50명 규모에서 투자 대비 가치 낮음 | 고정 레이아웃. 2-3년 운영 후 패턴 관찰 후 결정 |
| X8 | **역할별/부서별 대시보드 차별화** | "관리자는 전체 통계 보여줘" | 역할 분기 로직, 권한별 테스트 매트릭스 증가. 통계 기능은 Phase 1-C 예정 | 관리자는 동일 대시보드 + 별도 통계 페이지 (1-C)에서 |
| X9 | **이메일 인라인 결재 (메일에서 바로 승인 버튼)** | "편하잖아" | 서명된 링크, CSRF, 1회성 토큰, 반려 사유 입력 부재, 감사로그 무결성 훼손. 보안 감사 시 문제 | 메일에는 **링크만**. 로그인 후 처리 — 보안/감사 트레일 유지 |
| X10 | **하드코딩 양식 3개 추가 (PurchaseRequest.tsx 등)** | PRD §5.1 예시 코드를 문자 그대로 따름 | v1.1에서 CUSTOM 렌더러가 완성됨 → 하드코딩은 유지보수 부담만 증가. approval_template + JSON 스키마로 대체 가능 | **CUSTOM 스키마 seed 방식 채택** (D1-D3). `TEMPLATE_REGISTRY` 확장 불필요 |
| X11 | **이메일 다이제스트 (하루 1번 요약)** | "메일 너무 많이 와" | 스케줄러, 이벤트 집계 스토어, 다이제스트 템플릿 별도. 50명 × 하루 10건 = 환경상 폭주 없음 | E5 (사용자별 on/off)로 해결. 필요 시 Phase 1-C 검토 |
| X12 | **검색 결과 정렬 옵션 (다중 정렬 키)** | "제목 기준으로 정렬하고 싶다" | UI 복잡, 정렬 조합 폭발 | 기본: `submitted_at DESC` 고정. 필터로 범위 좁히면 정렬 거의 불필요 |

---

## Feature Dependencies

```
[B6 열람 권한 WHERE] ──required by──> [B1~B5 모든 검색/필터]
                                           │
                                           └── 모든 검색 쿼리가 같은 필터 함수 재사용

[B1~B9 검색 API] ──required by──> [E8 CSV 내보내기]
                                   └── 동일 쿼리 + 포맷만 전환

[A1 이벤트 발송] ──required by──> [A5 notification_log 기록]
                                   └── INSERT는 이벤트 처리 커밋 후 진행

[A1 이벤트 발송] ──enhanced by──> [E1 앞 승인자 comment 포함]
                                   └── 이벤트 페이로드 확장만 하면 됨

[A2 문서 직링크] ──requires──> [app.base-url 환경변수]

[E5 사용자 알림 on/off] ──enhances──> [A1 이벤트 발송]
                                       └── 발송 전 user.email_notifications 체크

[C2 결재 대기 5건] ──uses──> [기존 /api/approvals/pending API]
                               └── LIMIT 5 쿼리 파라미터 추가 또는 새 엔드포인트

[D1~D3 추가 양식] ──requires──> [v1.1 CUSTOM 렌더러]
                                  └── 하드코딩 컴포넌트 없이 스키마로만 제공

[D4 프리셋 카탈로그] ──requires──> [v1.1 CNV-04 프리셋 시스템]
                                     └── JSON 3개만 추가
```

### 주요 의존성 노트

- **B6 (열람 권한 필터)**는 모든 검색/필터 기능의 **선행 조건**. 먼저 구현해야 함. 관련 테스트 케이스(본인/결재선 포함/ADMIN/SUPER_ADMIN/외부인)를 SearchSpec 파일에 문서화.
- **A1 (이벤트 발송)**은 **TransactionPhase.AFTER_COMMIT**만 사용. 이벤트를 `BEFORE_COMMIT`에서 발행하면 트랜잭션 롤백 시 메일 오발송 사고. 이 패턴 한 번 잘못 끼면 전 이벤트로 전파되어 피해 큼.
- **E5 (사용자 알림 on/off)**는 A1에 **얹히는** 기능. A1 기본 경로가 안정화된 뒤 추가. 순서 중요.
- **D1-D3 (추가 양식)**은 v1.1 빌더 완성도가 전제. 빌더가 덜 성숙하면 스키마 seed로 표현하기 어려운 필드 조합에서 막힘. v1.1 audit이 "SHIPPED"이므로 문제없음.
- **C2 (결재 대기 5건)**와 **E7 (홈페이지 고정)**은 같은 엔드포인트 확장 → 한 PR로 묶는 것이 효율적.

---

## MVP Definition for v1.2

### Launch With (v1.2)

일상 업무 대체 수준의 최소 세트.

- [ ] **A1** — 5종 이벤트 메일 발송 (상신 / 중간 승인 / 최종 승인 / 반려 / 회수)
- [ ] **A2** — 메일 본문에 문서 직링크
- [ ] **A4** — 발송 실패 2회 재시도
- [ ] **A5** — notification_log 기록
- [ ] **A6** — 비활성/퇴직 사용자 스킵
- [ ] **A7** — `[MiceSign]` 제목 접두사
- [ ] **B1** — 키워드 검색 (제목 + 문서번호)
- [ ] **B2** — 상태 필터 (복수)
- [ ] **B3** — 양식 필터
- [ ] **B4** — 기간 필터 (상신일)
- [ ] **B5** — 기안자 필터
- [ ] **B6** — 열람 권한 WHERE (**보안 필수**)
- [ ] **B7** — 타인의 DRAFT 제외
- [ ] **B8** — 페이지네이션
- [ ] **B10** — 필터 URL 동기화
- [ ] **C2** — 내 결재 대기 최근 5건 미리보기
- [ ] **C3** — 내 최근 기안 5건 (v1.0 이미 있음, UI 재확인)
- [ ] **C5** — 빠른 작성 버튼
- [ ] **C6** — 빈 상태 / 로딩 상태 처리
- [ ] **D1/D2/D3 중 최소 1개** — CUSTOM 스키마로 추가 양식 seed
- [ ] **D4** — 프리셋 카탈로그에 신규 3종 추가

### Add After Validation (v1.2.x)

Launch 이후 사용자 피드백 기반으로 즉시 추가 가능한 것들.

- [ ] **A3** — HTML + Plain Text 듀얼 포맷 (스팸 문제 실제 발생 시)
- [ ] **E1** — 앞 승인자 comment 메일 포함 (중간 결재자 피드백)
- [ ] **E4** — "오래 대기 중" 배지 (초기 통계로 임계값 결정)
- [ ] **E5** — 사용자별 알림 on/off (휴가철 민원 시)
- [ ] **E9** — 메일 HTML 로고/브랜딩

### Future Consideration (v1.3+ / Phase 1-C+)

- [ ] **E2** — 양식별 메일 요약 카드 (ROI 검증 후)
- [ ] **E3** — 검색 프리셋 / 최근 검색
- [ ] **E6** — 글로벌 검색 단축키
- [ ] **E8** — CSV 내보내기 (Phase 1-C 통계와 함께)
- [ ] **MariaDB FULLTEXT** 도입 (문서 본문 검색 수요 확인 시)

---

## Feature Prioritization Matrix

| # | Feature | User Value | Impl. Cost | Priority |
|---|---------|------------|------------|----------|
| A1 | 5종 이메일 알림 | HIGH | MEDIUM | **P1** |
| A2 | 메일 내 직링크 | HIGH | LOW | **P1** |
| A4 | 발송 재시도 | MEDIUM | LOW | **P1** |
| A5 | notification_log | MEDIUM | LOW | **P1** |
| A6 | 비활성 사용자 스킵 | HIGH | LOW | **P1** |
| B1 | 키워드 검색 | HIGH | LOW | **P1** |
| B2 | 상태 필터 | HIGH | LOW | **P1** |
| B3 | 양식 필터 | MEDIUM | LOW | **P1** |
| B4 | 기간 필터 | HIGH | LOW | **P1** |
| B5 | 기안자 필터 | MEDIUM | LOW | **P1** |
| B6 | 열람 권한 WHERE | HIGH (보안) | MEDIUM | **P1** |
| B7 | DRAFT 제외 | HIGH (프라이버시) | LOW | **P1** |
| B8 | 페이지네이션 | HIGH | LOW | **P1** |
| B10 | URL 동기화 | MEDIUM | LOW | **P1** |
| C2 | 결재 대기 5건 위젯 | HIGH | LOW | **P1** |
| C5 | 빠른 작성 버튼 | MEDIUM | LOW | **P1** |
| C6 | 빈/로딩 상태 | MEDIUM | LOW | **P1** |
| D1 | 구매요청 양식 | MEDIUM | MEDIUM | **P1** |
| D2 | 출장보고 양식 | MEDIUM | MEDIUM | P2 |
| D3 | 연장근무 양식 | MEDIUM | MEDIUM | P2 |
| D4 | 프리셋 카탈로그 확충 | MEDIUM | LOW | **P1** |
| A3 | HTML+Plain 듀얼 | MEDIUM | LOW | P2 |
| A7 | 제목 prefix | MEDIUM | LOW | **P1** |
| E1 | 앞 승인자 comment | MEDIUM | LOW | P2 |
| E4 | 오래 대기 배지 | MEDIUM | LOW | P2 |
| E5 | 사용자 알림 on/off | MEDIUM | LOW | P2 |
| E8 | CSV 내보내기 | LOW | LOW | P3 |
| E2 | 메일 양식별 요약 | MEDIUM | MEDIUM | P3 |
| E3 | 검색 프리셋 | LOW | LOW | P3 |
| E6 | 글로벌 검색 단축키 | LOW | LOW | P3 |
| E7 | 홈 고정 | LOW (중복) | LOW | P3 |
| E9 | 메일 브랜딩 | LOW | LOW | P3 |

**Priority key:**
- **P1:** v1.2 출시 필수 (일상 업무 대체 선언이 성립하려면)
- **P2:** v1.2 출시 직후 피드백 기반 추가
- **P3:** Phase 1-C 검토 (통계/리포트와 묶는 게 자연스러움)

---

## Competitor / Reference Feature Analysis

비교 대상: 동일 도메인(전자결재) 경쟁 제품. 기능명만 차용하고 스케일은 우리 규모에 맞춤.

| Feature | Docswave (레거시 대체 대상) | Kakao Work 결재 | Our Approach (v1.2) |
|---------|--------------------------|-----------------|---------------------|
| **이메일 알림** | 5종 이벤트 + 알림센터 | 카톡 푸시 + 이메일 fallback | **이메일 단일 채널** — 복잡도 최소화, A1-A7 집중 |
| **실시간 푸시** | 웹 푸시 / 모바일 앱 | 카톡 | **미구현** (anti-feature X2). TanStack Query refetch로 체감 완화 |
| **검색** | 전문 검색, 고급 필터, 결재자 검색 | 제목/상태/기간 | **복합 필터 + 제목+문서번호 LIKE**. 전문 검색 제외 (X6) |
| **대시보드** | 위젯 드래그 커스터마이징 | 결재 요약 카드 | **고정 레이아웃** — 50명 규모에서 커스터마이징 가치 낮음 (X7) |
| **다이제스트 메일** | 일간/주간 요약 옵션 | 없음 | **미구현** (X11). on/off만 제공 (E5) |
| **양식 확장** | 40종 빌트인 프리셋 | 자체 양식 편집기 | **CUSTOM 빌더로 임의 확장** (v1.1 자산) + 프리셋 3종 추가 |
| **인라인 결재** | 메일 내 승인 버튼 | 카톡 봇 | **미구현** (X9). 링크 클릭 후 로그인 처리만 |

**포지셔닝:** Docswave의 "모두를 위한 기능 덩어리"가 아니라, **"50명 조직에 맞춰 정확히 필요한 만큼"**의 전자결재. 기능 개수로 경쟁하지 않음.

---

## Risk / Scope Flags for Roadmap

로드맵 작성자가 유의해야 할 지점:

1. **SMTP 설정은 환경별로 다름** — 로컬 개발(MailHog/Mailpit), 스테이징(Gmail SMTP 또는 Mailtrap), 프로덕션(사내 메일 서버) 분리. `application-{profile}.yml`에서 host/port/auth 분기. Phase 최초에 로컬 Mailpit 컨테이너로 통합 테스트 해야 스팸/차단 문제 조기 발견.
2. **@TransactionalEventListener + @Async 조합**의 프록시 이슈 — 같은 클래스 내 self-invocation 시 Spring 프록시 우회되어 비동기 작동 안 함. 이벤트 리스너는 **별도 Bean**(예: `NotificationEventListener`)으로 분리할 것.
3. **검색 권한 필터는 QueryDSL로 구축** — JPQL 문자열 조합은 유지보수/오류 위험. QueryDSL `BooleanBuilder`로 조건별 append. v1.0에서 QueryDSL 설정이 끝나 있으므로 신규 비용 없음.
4. **notification_log 크기 관리** — 50명 × 일 평균 10건 × 3년 = ~54만건. 문제 없지만 Phase 1-C에서 90일 이상 레코드 `status=SUCCESS` 건은 아카이브 고려.
5. **양식 추가는 CUSTOM 스키마 방식 확정** — 하드코딩 컴포넌트 추가(X10)는 v1.1 투자를 무효화. 로드맵 phase description에 "추가 양식은 `approval_template` 레코드 + JSON 스키마 seed로 구현한다"를 못박을 것.
6. **이메일 발송이 실패해도 결재 플로우는 성공** — A1~A6 구현 시 메일 실패가 비즈니스 트랜잭션을 막지 않도록 격리. `@Async` + 롤백 전파 차단.

---

## Dependencies on Existing v1.0 / v1.1 (Summary)

| v1.2 Feature | Depends on (v1.0/v1.1) | Risk if Absent |
|--------------|------------------------|----------------|
| A1 이메일 발송 | `user.email`, 상태 전이 훅(APR-03/04, DOC-03/05) | 없음 — 모두 구현됨 |
| A5 notification_log | v1.0 DDL에 테이블 정의 | 없음 — DDL 존재, Flyway migration만 있으면 됨 |
| B1-B5 검색 필터 | `document` 인덱스 (`idx_status`, `idx_submitted_at`, `idx_template_code`), QueryDSL 설정 | 없음 — 모두 있음 |
| B6 열람 권한 | PRD §7.3 정책, `approval_line` 테이블 | 없음 — 정책/스키마 모두 확정 |
| C1-C6 대시보드 | v1.0 `/api/dashboard` 엔드포인트 | 없음 — 확장만 하면 됨 |
| D1-D4 양식 | v1.1 CUSTOM 렌더러, v1.1 프리셋 시스템 (CNV-04) | **v1.1이 SHIPPED 상태이므로 안전**. Phase 24.1 CUSTOM 렌더러가 없으면 막힘 |
| E5 알림 on/off | `user` 테이블 컬럼 추가 필요 | Flyway 마이그레이션 1개 — 리스크 낮음 |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| A. 이메일 알림 | **HIGH** | PRD §9 + FSD FN-NTF-001에 이벤트/수신자/재시도/테이블 모두 명시됨. 구현 패턴(Spring `@TransactionalEventListener + @Async + Retry`)이 업계 표준, 2026년 현재도 최신 베스트 프랙티스 |
| B. 검색/필터 | **HIGH** | FSD FN-SEARCH-001에 파라미터/권한 SQL까지 완성. 인덱스 이미 존재. QueryDSL 숙련도 외 불확실성 없음 |
| C. 대시보드 | **HIGH** | v1.0에서 이미 80% 구현. 확장은 소폭 (recentApprovals 배열 추가, UI 재배치) |
| D. 양식 확장 | **MEDIUM-HIGH** | v1.1 CUSTOM 렌더러 SHIPPED — 기술적으로는 HIGH. 단, 각 양식(구매/출장/연장)의 실제 스키마는 회사 양식 수집이 필요 (사용자 확인 필요) |
| E. Differentiators | **MEDIUM** | 50명 조직의 실제 사용 패턴은 출시 전에는 가설 수준. P2/P3 구분은 맞지만 구체적 순서는 유저 피드백 기반 조정 필요 |
| Anti-features | **HIGH** | 명확한 reasoning (스케일, 아키텍처 상충, 보안 영향)으로 배제 — 반대 주장이 나와도 논리로 방어 가능 |

---

## Sources

- [MiceSign PRD v2.0](../../docs/PRD_MiceSign_v2.0.md) — §5 양식, §6 워크플로우, §7 보안, §9 알림, §14 NFR
- [MiceSign FSD v1.0](../../docs/FSD_MiceSign_v1.0.md) — FN-NTF-001, FN-SEARCH-001, FN-DASH-001, §13 Phase 매핑
- [v1.1 Requirements Archive](../milestones/v1.1-REQUIREMENTS.md) — v1.1 shipped scope (CUSTOM 렌더러, 프리셋)
- [Project State](../PROJECT.md) — Active requirements for v1.2
- Atlassian Workstream: [Optimize Your Approval Process](https://www.atlassian.com/work-management/project-management/approval-process-workflow) — multi-channel notification principle (we intentionally diverge)
- Kissflow: [Approval Process Guide 2026](https://kissflow.com/workflow/approval-process/) — table stakes confirmation (notifications, audit trail, clear routing)
- Nidhal Naffati: [Asynchronous Retry Mechanism for Email Sending in Spring](https://nidhalnaffati.netlify.app/blog/spring-async-retry/) — `@Retryable` + `@Backoff` pattern for A4
- Sequenzy: [How to Send Emails in Java / Spring Boot (2026 Guide)](https://www.sequenzy.com/blog/send-emails-spring-boot) — async + HTML mail best practices
- Medium (Samyak Moon): [Async email notification using @Async](https://medium.com/@samyakmoon855/send-email-notification-using-springboot-part-2-asynchronous-approach-using-async-annotation-05d10cad5ae5) — performance benefit verification (3.78s → 207ms)
- Docswave: [docswave.com](https://www.docswave.com/en) — competitor reference (we are a 50-person-scale Docswave alternative)

---
*Feature research for v1.2 Phase 1-B (일상 업무 대체 수준)*
*Researched: 2026-04-22*
