# Phase 32: CUSTOM 프리셋 확장 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 32-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 32-custom
**Areas discussed:** 회의록 스키마, 품의서 스키마, 명명 규칙, PresetGallery 레이아웃, Snapshot 불변성 검증, 필드 세부 config, PresetGallery 정렬 순서, JSON name vs i18n key SoT (총 8 영역)

---

## 영역 1: 회의록 스키마 (필드 구성)

### 회의 일시 필드 구성

| Option | Description | Selected |
|--------|-------------|----------|
| date 하나만 | type='date' 한 필드 — 회의 날짜만 기록. expense 패턴. | ✓ |
| date + time(text) 두 필드 | type='date' + type='text' (placeholder='14:00-16:00'). | |
| date + startTime + endTime 3 필드 | 시작/종료 각각 명시. calculationRule 가능. | |

**User's choice:** date 하나만 (Recommended)

### 참석자 표현

| Option | Description | Selected |
|--------|-------------|----------|
| table multi-row [이름/소속/역할] | leave/purchase 패턴. minRows=1, maxRows=20. 구조화 | ✓ |
| textarea (자유 기입) | type='textarea' 으로 쉼표 구분 자유 기록. | |
| table [이름/소속] (역할 제외) | 2-column 단순화. | |

**User's choice:** table multi-row [이름/소속/역할] (Recommended)

### 안건 표현

| Option | Description | Selected |
|--------|-------------|----------|
| table multi-row [순번/안건명/설명] | 구조화 — 결정사항과 1:1 대응 가능. minRows=1, maxRows=20. | ✓ |
| textarea (단일 자유 기입) | 자유 서술 — '1. 예산 승인 / 2. 일정' 형식. | |
| table [안건명/설명] (순번 제외) | 행 index 가 자연 순번. | |

**User's choice:** table multi-row [순번/안건명/설명] (Recommended)

### 결정사항 표현

| Option | Description | Selected |
|--------|-------------|----------|
| table [안건명/결정내용/담당자/기한] | 즉각 가능한 결정사항 추적. dueDate 명확화. | ✓ |
| textarea (단일 자유 기입) | 자유 기록. | |
| table [결정내용/담당자] (기한 제외) | 기한 없는 강한 결정. | |

**User's choice:** table [안건명/결정내용/담당자/기한] (Recommended)

### conditionalRule / calculationRule 추가

| Option | Description | Selected |
|--------|-------------|----------|
| 둘 다 없음 | 회의록은 record-keeping. 자동 계산/조건부 노출 미사용. | ✓ |
| 회의 종류 select + conditionalRule | leave 패턴 (사유 조건부) 재현. | |
| calculationRule (소요 시간 계산) | startTime+endTime 조합. | |

**User's choice:** 둘 다 없음 (Recommended)

---

## 영역 2: 품의서 스키마 (필드 구성)

### 첨부 처리 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 스키마에서 제거 — 문서 차원 첨부 사용 | document_attachment + Google Drive 인프라 활용. 관심사 분리. | ✓ |
| type='text' 필드로 '첨부 목록 설명' | JSON 에 textarea 로 파일명만 기록. 이중 입력 부담. | |
| type='hidden' placeholder 필드 | 의견 수렴절 한대만. | |

**User's choice:** 스키마에서 제거 — 문서 차원 체도 사용 (Recommended)

### 예상 효과 표현

| Option | Description | Selected |
|--------|-------------|----------|
| textarea 단일 | 정성적 서술 우선 — 자유 기록. | ✓ |
| table [효과 항목/설명/예상 금액] | 정량 명시 우선 — calculationRule 가능. | |
| textarea + 수치 number 필드 병행 | 서술+수치 하이브리드. | |

**User's choice:** textarea 단일 (Recommended)

### 추가 구조 필드

| Option | Description | Selected |
|--------|-------------|----------|
| 제목 필드 추가 | id='title' type='text' required. 다른 preset 표준. | ✓ |
| title + dueDate (마감일 date) | 의사결정 마감일 명시. | |
| title + estimatedBudget (number, 원) | 예상 예산 구체수치. | |
| title 만 추가 (최소) | 필수 필드 이후 추가 구조 없음. | |

**User's choice:** 제목 필드 추가 (Recommended)

---

## 영역 3: 명명 규칙 (filename / prefix / icon / category)

### 회의록 filename + prefix

| Option | Description | Selected |
|--------|-------------|----------|
| meeting.json + prefix='MTG' | 간결·국제적. 패턴 명료. | ✓ |
| minutes.json + prefix='MIN' | 'meeting minutes' 공식 용어. MIN 혼동 가능성. | |
| meeting-minutes.json + prefix='MTG' | filename 명확화. 하이픈 포함. | |

**User's choice:** meeting.json + prefix='MTG' (Recommended)

### 품의서 filename + prefix

| Option | Description | Selected |
|--------|-------------|----------|
| proposal.json + prefix='PRP' | 국제적. v1.1 패턴 일관. | ✓ |
| approval.json + prefix='APR' | 한국 결재식 명칭. 시스템 용어 충돌 우려. | |
| request.json + prefix='REQ' | '요청' 의미 매칭. 너무 일반적. | |

**User's choice:** proposal.json + prefix='PRP' (Recommended)

### lucide 아이콘

| Option | Description | Selected |
|--------|-------------|----------|
| 회의록=Users, 품의서=FileSignature | Users (사람들) 직관적. FileSignature (서명 문서) 명료. | ✓ |
| 회의록=ClipboardList, 품의서=Megaphone | ClipboardList 기록 지향. Megaphone 따뜻함. | |
| 회의록=MessageSquare, 품의서=Lightbulb | 대화/아이디어. 공식 문서 성격 약함. | |

**User's choice:** 회의록=Users, 품의서=FileSignature (Recommended)

### category

| Option | Description | Selected |
|--------|-------------|----------|
| 둘 다 'general' 재사용 | 기존 finance/hr/general 활용. PresetGallery 에 미표시. | ✓ |
| 각각 신규 'meeting' / 'proposal' | 미래 필터링 명확화. | |
| 회의록='general', 품의서='hr' 또는 'finance' | 의사결정 성격 분류. | |

**User's choice:** 둘 다 'general' 재사용 (Recommended)

---

## 영역 4: PresetGallery 레이아웃 (4개 → 6개)

### grid 업그레이드

| Option | Description | Selected |
|--------|-------------|----------|
| 그대로 (grid-cols-2, 3행 × 2열) | 코드 수정 제로. modal max-h-80vh 안에서 스크롤. | ✓ |
| lg:grid-cols-3 으로 업그레이드 | 데스크탑 2행 × 3열. 한 줄 수정. | |
| md:grid-cols-3 lg:grid-cols-3 | 더 넓은 레인지에서 3열. 시각 밀도 증가. | |

**User's choice:** 그대두고 (grid-cols-2, 3행 × 2열) (Recommended)

### presets.test.ts 업데이트

| Option | Description | Selected |
|--------|-------------|----------|
| length 6 + keys 6개 명시적 업데이트 | v1.1 의 명시 단언 스타일 존중. simple/deterministic. | ✓ |
| 수치 단언 제거 + 'subset' 명시 | 미래 증가 장벽 제거. v1.1 의도와 다름. | |
| 파라메트릭 each preset | describe.each 로 자동 생성. 기존 하드코딩과 충돌. | |

**User's choice:** length 6 + keys 6개 명시적 업데이트 (Recommended)

### 신규 i18n 키 패턴

| Option | Description | Selected |
|--------|-------------|----------|
| presetMeetingName/Desc + presetProposalName/Desc | 기존 'preset{Title}Name/Desc' 패턴 유지. 4 신규 키 추가. | ✓ |
| JSON 의 name/description 직접 사용 | i18n MAP 항목 생략. PresetGallery fallback. | |
| ko + en 둘 다 추가 | 다국어 지원. 한국어 only 정책 위반. | |

**User's choice:** presetMeetingName/Desc + presetProposalName/Desc (Recommended)

---

## 영역 5: Snapshot 불변성 검증

### 검증 수준

| Option | Description | Selected |
|--------|-------------|----------|
| v1.1 인프라 신뢰 — 명시적 검증 없음 | Phase 26 의 schema_definition_snapshot + template_schema_version 가 이미 보장. 신규 preset 추가는 기존 row 무수정. | ✓ |
| presets.test.ts 에 'JSON 추가는 기존 preset 포함' 압년 테스트 | 기존 4 키 preserve + 신규 2 키 명시. | |
| Backend integration test (preset → 문서 → 렌더 회귀) | 과공조 — v1.1 추상화 계층 신뢰. | |

**User's choice:** v1.1 인프라 신뢰 — 명시적 검증 없음 (Recommended)

---

## 영역 6: 필드 세부 config

### table 필드 minRows (참석자 / 안건 / 결정사항)

| Option | Description | Selected |
|--------|-------------|----------|
| 며 minRows=1 (최소 1행 강제) | leave 패턴. 의미상 1건 이상 필수. | ✓ |
| minRows=0 (모두 온디맨드) | 유연성 우선. 빈 문서 제출 위험. | |
| 참석자=1, 안건=1, 결정사항=0 (세분화) | 일부 회의는 결정 없음 가능. 일관성 약함. | |

**User's choice:** 며 minRows=1 (최소 1행 강제) (Recommended)

### table 필드 maxRows

| Option | Description | Selected |
|--------|-------------|----------|
| 며 maxRows=20 | leave/expense/purchase 패턴 일치. 일관성. | ✓ |
| maxRows 제한 없음 | 대규모 회의 허용. UX 안티패턴 위험. | |
| 참석자=50, 안건=20, 결정사항=20 | 참석자만 너그럽게. | |

**User's choice:** 며 maxRows=20 (Recommended)

### textarea 필드 maxLength (품의서)

| Option | Description | Selected |
|--------|-------------|----------|
| 며 maxLength=2000 | 약 A4 1페이지. 일관성. | ✓ |
| 배경=1000 / 제안내용=3000 / 예상효과=1500 | 필드별 특성 공처. 메모 필요. | |
| maxLength 설정 안 함 (기존 4 프리셋과 동일) | UI 계층 자연 제한. 도메인 일관 우선. | |

**User's choice:** 며 maxLength=2000 (Recommended)

---

## 영역 7: PresetGallery 정렬 순서

| Option | Description | Selected |
|--------|-------------|----------|
| key 알파벳 순 유지 | 현재 sort(localeCompare) 그대로. 6개 순서: expense → leave → meeting → proposal → purchase → trip. | ✓ |
| JSON 에 sortOrder 필드 추가 → 수동 정렬 | templateImportSchema 변경 + 수동 관리. | |
| 한국어 명칭 알파벳 순 (i18n value 기준) | i18n hook 의존. 복잡도 증가. | |

**User's choice:** key 알파벳 순 유지 (Recommended)

---

## 영역 8: JSON name vs i18n key SoT

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 패턴 유지 — i18n 우선, JSON name 은 fallback | PresetGallery 로직 그대로. 양쪽 모두 채움. export/import 호환. | ✓ |
| JSON name 단일 SoT — PresetGallery I18N_MAP 삭제 | 단일화 깔끔. 다른 4 프리셋과 일관성 깨짐. | |
| i18n 단일 SoT — JSON 에서 name 제거 | name 가 주요 식별자. 광범위한 영향. | |

**User's choice:** 기존 패턴 유지 — i18n 우선, JSON name 은 fallback (Recommended)

---

## Claude's Discretion

- 회의록/품의서 JSON description 문구 자연어 검토 (i18n 과 약간 다를 수 있음, export fallback 용)
- attendees affiliation placeholder 안내 문구 (예: "예: 개발팀")
- 품의서 textarea placeholder 안내 문구 (가이드 텍스트)

## Deferred Ideas

- 품의서 정량 효과 expansion (table + estimatedBenefit calculationRule, v1.3+ budget-proposal preset)
- PresetGallery 7개 이상 시 grid-cols-3 upgrade
- JSON sortOrder 필드 도입
- i18n 영어 다국어 지원 (en/admin.json)
- 회의록 agenda number 자동 채번 (calculationRule, v1.3+)
- preset category 필터링/그룹화 UI
- 회의 종류 select + conditionalRule (v1.3+)
- 회의록 시작/종료 시간 + 소요시간 calculationRule
- Backend integration test (preset → 문서 → 렌더 회귀, Phase 33 또는 별도 hardening)

---

*Generated: 2026-04-25*
