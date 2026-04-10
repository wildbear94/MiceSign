# Phase 8: Dashboard & Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 08-dashboard-audit
**Areas discussed:** 대시보드 보완, 감사 로그 완전성, 양식 관리 UI

---

## 대시보드 보완

### 카운트 카드 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 현재 구성 충분 (추천) | 결재 대기/임시저장/완료 3개 카드로 충분. 임시저장=진행 중 초안으로 간주 | ✓ |
| 카드 추가/변경 | '제출 완료(승인 대기)' 카드를 추가하거나 기존 카드 라벨 조정 | |
| Claude 재량 | DASH-03 요구사항에 맞게 적절히 조정 | |

**User's choice:** 현재 구성 충분
**Notes:** 현재 3개 카드가 DASH-03 요구사항을 충족

### 리스트 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 현재대로 충분 (추천) | 최신 5건 표시 + 60초 자동 갱신으로 DASH-01/02 충족 | ✓ |
| 리스트 개수 조정 | 5건 대신 10건으로 늘리거나, 더보기 링크 추가 | |
| Claude 재량 | 적절히 보완 | |

**User's choice:** 현재대로 충분
**Notes:** 없음

---

## 감사 로그 완전성

| Option | Description | Selected |
|--------|-------------|----------|
| 누락만 보완 (추천) | 기존 코드에서 누락된 auditLogService.log() 호출만 추가 | ✓ |
| 전수 검증 | AUD-01이 요구하는 모든 액션을 체크리스트로 만들어 하나씩 검증 | |
| Claude 재량 | 적절히 검증 및 보완 | |

**User's choice:** 누락만 보완
**Notes:** ADMIN_USER_EDIT, ADMIN_ORG_EDIT 등 누락 여부 확인 후 보완

---

## 양식 관리 UI

### 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 목록 + 활성화/비활성화 (추천) | 양식 목록 페이지에서 활성/비활성 토글만 가능 | ✓ |
| 목록 + 상세 + 수정 | 양식 목록, 상세 보기, 이름/설명/prefix 수정까지 가능한 관리 페이지 | |
| Claude 재량 | 백엔드 API에 맞춰 적절히 구현 | |

**User's choice:** 목록 + 활성화/비활성화
**Notes:** 양식 자체는 코드로 관리되므로 CRUD 전체는 불필요

### 권한

| Option | Description | Selected |
|--------|-------------|----------|
| ADMIN 이상 (추천) | ADMIN과 SUPER_ADMIN 모두 양식 관리 가능 (ORG-04 기준) | ✓ |
| SUPER_ADMIN만 | SUPER_ADMIN만 양식 관리 가능 | |

**User's choice:** ADMIN 이상
**Notes:** ORG-04 기준 ADMIN은 조직/양식 관리 권한 보유

---

## Claude's Discretion

- 대시보드 컴포넌트 세부 스타일링
- 감사 로그 누락 탐지 방식
- 양식 관리 페이지 레이아웃

## Deferred Ideas

없음
