# Phase 16: Template Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the reasoning.

**Date:** 2026-04-06
**Phase:** 16-template-migration
**Mode:** discuss
**Areas analyzed:** 하드코딩 처리, 데이터 마이그레이션, 스키마 작성, 검증 전략

## Gray Areas Presented

### 하드코딩 컴포넌트 처리
| Option | Selected |
|--------|----------|
| 듀얼 렌더링 유지 (권장) | ✓ |
| 하드코딩 코드 삭제 | |
| 전환 기간 후 삭제 | |

### 데이터 마이그레이션
| Option | Selected |
|--------|----------|
| 변환 없음 — 기존 그대로 (권장) | ✓ |
| 기존 form_data도 새 스키마 형식으로 변환 | |

### 스키마 작성 방식
| Option | Selected |
|--------|----------|
| Flyway 시드 마이그레이션 (권장) | ✓ |
| 빌더 UI로 수동 생성 | |
| 코드 기반 스크립트 | |

### 검증 전략
| Option | Selected |
|--------|----------|
| 필드 구조 + 렌더링 비교 (권장) | ✓ |
| 필드 구조만 자동 테스트 | |
| 전체 E2E 테스트 | |

## Corrections Made

No corrections — all recommended options confirmed.
