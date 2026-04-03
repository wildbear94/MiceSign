# Phase 8: Dashboard & Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 08-dashboard-audit
**Areas discussed:** 대시보드 레이아웃, 뱃지 카운트 위치, 감사 로그 범위, 대시보드 라우팅, 대시보드 빈 상태, 카운트 API 설계, 감사로그 UI 포함 여부, 실시간 업데이트

---

## 대시보드 레이아웃

| Option | Description | Selected |
|--------|-------------|----------|
| 카드 그리드 | 상단 뱃지 카운트 카드 3개 + 하단 결재대기/최근문서 나란히 | ✓ |
| 단일 칼럼 | 세로로 뱃지 → 결재대기 → 최근문서 순서로 쌓기 | |
| Claude 재량 | Claude가 적절한 레이아웃 선택 | |

**User's choice:** 카드 그리드
**Notes:** None

---

## 표시 건수

| Option | Description | Selected |
|--------|-------------|----------|
| 각 5건 | 간결한 요약, 전체 목록은 기존 페이지로 이동 | ✓ |
| 각 10건 | 더 많이 보여주되 스크롤 필요 | |
| Claude 재량 | Claude가 결정 | |

**User's choice:** 각 5건

---

## 새 문서 버튼

| Option | Description | Selected |
|--------|-------------|----------|
| 표시 | 대시보드 상단에 '새 문서 작성' 버튼 | ✓ |
| 비표시 | 기존 '내 문서' 페이지에서만 새 문서 작성 | |

**User's choice:** 표시

---

## 뱃지 카운트 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 네비바 + 대시보드 | 양쪽 모두 표시 | ✓ |
| 네비바만 | 네비바 링크 옆에만 뱃지 | |
| 대시보드만 | 대시보드 카드에만 카운트 | |

**User's choice:** 네비바 + 대시보드

---

## 감사 로그 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 상태변경 + 인증 | 문서 CRUD/상신/승인/반려/회수 + 로그인/로그아웃 + 파일 업/다운 | ✓ |
| 전체 기록 | 위 + 관리자 액션 + 비밀번호 초기화 등 모든 것 | |
| Claude 재량 | AUD-01에 맞춰 Claude 결정 | |

**User's choice:** 문서 상태변경 + 인증

---

## 감사 로그 기록 방식

| Option | Description | Selected |
|--------|-------------|----------|
| AOP + 서비스 혼합 | 인증은 AOP 자동, 문서는 서비스에서 명시적 | ✓ |
| 서비스 레이어만 | 모든 로깅을 서비스에서 직접 호출 | |
| Claude 재량 | Claude가 적절한 방식 선택 | |

**User's choice:** AOP + 서비스 혼합

---

## 대시보드 라우팅

| Option | Description | Selected |
|--------|-------------|----------|
| / → 대시보드 | 홈 경로를 대시보드로 변경 | ✓ |
| / → /documents/my 유지 | 현행 유지, 대시보드는 /dashboard로 별도 | |

**User's choice:** / → 대시보드

---

## 네비바 대시보드 링크

| Option | Description | Selected |
|--------|-------------|----------|
| 로고 클릭으로 대체 | MiceSign 로고 클릭 → 대시보드 이동 | |
| 대시보드 링크 추가 | 네비바에 '대시보드' 탭 새로 추가 | ✓ |

**User's choice:** 대시보드 링크 추가

---

## 대시보드 빈 상태

| Option | Description | Selected |
|--------|-------------|----------|
| 격려 메시지 | 빈 상태 아이콘 + 메시지, 기존 패턴과 동일 | ✓ |
| 섹션 숨김 | 데이터 없으면 해당 섹션 자체를 숨기기 | |

**User's choice:** 격려 메시지

---

## 카운트 API 설계

| Option | Description | Selected |
|--------|-------------|----------|
| 단일 요약 API | GET /api/v1/dashboard/summary → 한 번 호출로 모든 카운트 | ✓ |
| 개별 API | 각 카운트별 별도 엔드포인트 | |

**User's choice:** 단일 요약 API

---

## 감사로그 UI 포함 여부

| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드 로깅만 | 백엔드 기록만, UI는 Phase 1-C (AUD-02) | |
| 기본 조회 UI 포함 | SUPER_ADMIN용 간단한 로그 목록 + 필터 페이지 포함 | ✓ |

**User's choice:** 기본 조회 UI 포함

---

## 실시간 업데이트

| Option | Description | Selected |
|--------|-------------|----------|
| 폴링 60초 | refetchInterval 60초로 자동 갱신 | ✓ |
| 수동 새로고침만 | 페이지 진입 시에만 데이터 로드 | |
| Claude 재량 | Claude가 적절한 방식 선택 | |

**User's choice:** 폴링 60초

---

## Claude's Discretion

None — user made explicit choices for all areas.

## Deferred Ideas

- Admin CRUD audit logging — deferred to Phase 1-C per PRD phasing
