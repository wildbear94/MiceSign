---
phase: 32-custom
type: human-uat
status: complete
created: 2026-04-25
tester: park sang young
tested_at: 2026-04-26
requirements:
  - FORM-01
  - FORM-02
threat_refs:
  - T-32-01
  - T-32-02
---

# Phase 32 — HUMAN UAT 체크리스트

> 자동 검증 (vitest full suite + Vite build + tsc --noEmit) 모두 green 확인 후 본 체크리스트의 모든 항목을 직접 시각/조작 확인.
>
> 자동 검증 결과 (Plan 06 Task 1):
> - vitest: 10 passed | 4 skipped (14 files), 60 passed | 39 todo (99 tests), 2.34s
> - vite build: ✓ built in 646ms (2468 modules transformed)
> - tsc --noEmit: 종료코드 0 (무에러)
> - presets.test.ts 단독 실행: 9 passed (9) — Plan 05 의 의도된 length=6/keys=6/meeting fields=5/proposal fields=4 단언 GREEN
>
> Phase 32 의 모든 자동 단언이 통과한 상태에서 시각/조작 확인을 시작.

## 사전 준비

1. `cd backend && ./gradlew bootRun` — application-local 프로필 (백엔드 dev server)
2. `cd frontend && npm run dev` — Vite dev server (기본 5173)
3. SUPER_ADMIN 또는 ADMIN 계정으로 로그인 (양식 관리 권한 필요)
4. 일반 USER 계정도 1개 준비 (섹션 2-B / 섹션 3 의 사용자 기안 흐름 검증용)

---

## 섹션 1 — PresetGallery 6 카드 시각 확인 (T-32-01 자동 차단 + UI 회귀)

> RESEARCH.md L660-665 의 FORM-01/02 manual 단언 — 한국어 라벨 정상, raw key 텍스트 미노출.

1. [ ] 관리자 메뉴 → "양식 관리" → "신규 양식 추가" 버튼 클릭
2. [ ] "프리셋 선택" 모달 (PresetGallery) 가 열린다
3. [ ] **6 개 카드** 가 grid-cols-2 (3행 × 2열) 로 표시된다 — modal max-h-[80vh] + overflow-y-auto 적용
4. [ ] 각 카드의 제목과 설명이 한국어로 정상 표시 (raw key 텍스트 `templates.preset*` 미노출):
   - [ ] 경비신청서 — 항목/단가/수량/합계 테이블과 자동 합계 계산을 포함합니다 (Receipt 아이콘)
   - [ ] 휴가신청서 — 휴가 종류 선택과 기간별 조건부 사유 입력을 포함합니다 (CalendarDays 아이콘)
   - [ ] 출장신청서 — 일정·동행자·예상 비용 계산을 포함합니다 (Plane 아이콘)
   - [ ] 구매신청서 — 품목 테이블과 총액 자동 계산을 포함합니다 (ShoppingCart 아이콘)
   - [ ] **회의록** — 회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다 (**Users** 아이콘)
   - [ ] **품의서** — 품의 배경·제안 내용·예상 효과를 정리합니다 (**FileSignature** 아이콘)
5. [ ] 카드 알파벳 정렬 확인 — 좌→우, 위→아래 순서: expense → leave → meeting → proposal → purchase → trip (D-C4 localeCompare 결과)
6. [ ] 모달 닫기 (X 버튼 또는 Escape) 정상 작동

---

## 섹션 2 — 회의록 양식 생성 + 사용자 기안 (FORM-01 + T-32-02 검증)

> T-32-02 cross-scope id 충돌 가설의 manual 검증 단계. 옵션 A (agenda.columns[1].id='title' 그대로) 가 안전하면 PASS, 충돌 발견 시 옵션 B (id='subject' rename) 적용 후 Plan 01/05 후속 수정.

### 2-A. 관리자 양식 생성

7. [ ] PresetGallery 에서 **회의록** 카드 클릭
8. [ ] TemplateFormModal 이 prefill 되어 열린다
   - [ ] 양식명 = "회의록" (D-A1)
   - [ ] **prefix 입력란이 빈 상태** (Phase 26 D-10 의 prefix='' reset)
   - [ ] description = "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다"
   - [ ] category = general
9. [ ] FormPreview 패널에 5 개 필드 표시:
   - [ ] 제목 (text, required)
   - [ ] 회의 일시 (date, required)
   - [ ] 참석자 (table, 3 columns: 이름/소속/역할, minRows=1, maxRows=20)
   - [ ] 안건 (table, 3 columns: 번호/안건명/설명, minRows=1, maxRows=20)
   - [ ] 결정사항 (table, 4 columns: 주제/결정/담당자/기한, minRows=1, maxRows=20)
10. [ ] 사용자가 신규 prefix 입력 (예: "MTG-TEST")
11. [ ] "저장" 버튼 클릭 → 양식 목록에 회의록(MTG-TEST) row 추가됨

### 2-B. 사용자 기안 흐름 + T-32-02 cross-scope id 검증

12. [ ] 일반 사용자 (또는 같은 SUPER_ADMIN) 으로 "신규 기안" → 회의록 양식 선택
13. [ ] DynamicCustomForm 정상 렌더 (5 필드 모두 표시)
14. [ ] **root 제목 (id='title', text)** 입력란에 "Q2 기획 회의록" 입력
15. [ ] 회의 일시 입력 (예: 오늘 날짜)
16. [ ] 참석자 table 의 "행 추가" 버튼 클릭 → 1 행 추가 → 이름/소속/역할 입력
17. [ ] 안건 table 의 "행 추가" 버튼 클릭 → 1 행 추가됨
18. [ ] **agenda row 의 "안건명" (column id="title")** 입력란에 "신제품 출시 일정" 입력
19. [ ] 결정사항 table 의 "행 추가" 버튼 클릭 → 1 행 추가 → 주제/결정/담당자/기한 입력
20. [ ] 임시 저장 → 다시 열기 (또는 폼 다른 곳으로 이동 후 복귀)
21. [ ] **검증 (T-32-02 핵심 — 옵션 A 안전성 확정):**
    - [ ] root title 입력란에 "Q2 기획 회의록" 그대로 표시
    - [ ] agenda row 의 안건명 입력란에 "신제품 출시 일정" 그대로 표시
    - [ ] **두 값이 분리 저장됨** — react-hook-form path namespace (`title` vs `agenda.0.title`) 가 cross-scope id 충돌 방지 확인
    - [ ] **fail 시:** 즉시 stop, 본 체크리스트 status 를 fail 로 기록 + 옵션 B (agenda.columns[1].id 를 'subject' 로 rename) 후속 수정 필요. Plan 01 의 meeting.json 과 Plan 05 의 presets.test.ts 단언 동시 업데이트 요구.
22. [ ] 결재 상신 → 정상 처리 (결재선 선택 → 상신 → SUBMITTED 상태 전환)

---

## 섹션 3 — 품의서 양식 생성 + 사용자 기안 (FORM-02)

> D-B6 검증 — 첨부 필드는 schema 미포함, document_attachment + Google Drive 별도 처리.

23. [ ] PresetGallery 에서 **품의서** 카드 클릭
24. [ ] TemplateFormModal prefill:
    - [ ] 양식명 = "품의서"
    - [ ] **prefix 입력란이 빈 상태**
    - [ ] description = "품의 배경·제안 내용·예상 효과를 정리합니다"
    - [ ] category = general
25. [ ] FormPreview 패널에 4 개 필드 표시:
    - [ ] 제목 (text, required)
    - [ ] 품의 배경 (textarea, required, placeholder="예: 현재 시스템의 한계와 개선 필요성을 기술", maxLength=2000)
    - [ ] 제안 내용 (textarea, required, placeholder="구체적인 제안 사항을 기술", maxLength=2000)
    - [ ] 예상 효과 (textarea, required, placeholder="정성적·정량적 기대 효과를 기술", maxLength=2000)
26. [ ] **첨부 필드 미포함 확인** (D-B6) — FormPreview 에 attachment/file 타입 필드 없음
27. [ ] 신규 prefix 입력 (예: "PRP-TEST") + 저장 → 양식 목록에 품의서(PRP-TEST) row 추가됨
28. [ ] 일반 사용자 기안 흐름 → DynamicCustomForm 정상 렌더 (4 필드)
29. [ ] 3 textarea 모두 입력 + 제목 입력 + 저장 + 결재 상신 → 정상 처리
30. [ ] 문서 작성 화면의 "파일 첨부" UI 가 별도 영역에 정상 표시 — 품의서 schema 와 무관하게 document_attachment 시스템이 작동 (D-B6 관심사 분리 검증)

---

## 섹션 4 — 기존 4 preset 회귀 검증 (CLAUDE.md preserve)

> CLAUDE.md "기존 기능/메뉴/라우트 보존" 의무 — 신규 preset 2 추가가 기존 4 preset 의 흐름에 회귀를 일으키지 않는지 시각 확인.

31. [ ] **경비신청서** 카드 선택 → TemplateFormModal prefill (양식명/description/category=finance) → calculationRule (SUM(items.amount)) 가 FormPreview 에 정상 표시 → 양식 저장 + 사용자 기안 흐름 정상 (수량×단가 자동 합계)
32. [ ] **휴가신청서** 카드 선택 → TemplateFormModal prefill (category=hr) → conditionalRule (휴가 종류=sick → sickReason 노출) 정상 작동 (FormPreview + 사용자 기안 화면 양쪽)
33. [ ] **출장신청서** 카드 선택 → TemplateFormModal prefill → 양식 저장 정상 → 사용자 기안 화면에서 일정/동행자/예상 비용 입력 정상
34. [ ] **구매신청서** 카드 선택 → TemplateFormModal prefill → 품목 table + total 자동 계산 정상 (calculationRule preserve)

---

## 섹션 5 — Snapshot 불변성 (D-D2)

> v1.1 Phase 26 이후 누적된 schema_definition_snapshot 인프라가 신규 preset 2 추가로 인해 손상되지 않는지 확인.

35. [ ] 회의록/품의서 양식으로 작성된 문서가 있는 경우 (없으면 N/A) — 문서 상세 페이지를 다시 열었을 때 schema 변경 없이 그대로 표시됨
36. [ ] 기존 4 preset (경비/휴가/출장/구매) 으로 작성된 과거 문서를 다시 열었을 때 schema 표시 정상 — `approval_template.schema_definition_snapshot` 자동 보호 확인 (시각 확인 + 필요 시 DB 직접 점검 가능)
37. [ ] 양식 목록에서 회의록/품의서 row 의 schema 가 신규 양식 추가/삭제 후에도 동일하게 유지됨 (snapshot row-level 불변성)

---

## 통과 기준

- [ ] 모든 항목 (1-37) 체크 완료
- [ ] T-32-02 (섹션 2-B 의 21번) 명시적 통과 — root title vs agenda.title 분리 저장 (옵션 A 안전성 확정)
- [ ] 기존 4 preset 회귀 0건 (섹션 4)
- [ ] 첨부 필드 미포함 확인 (섹션 3 의 26번, D-B6)
- [ ] PresetGallery 6 카드 한국어 라벨 정상 (섹션 1 의 4번)

## 회귀 확인 (CLAUDE.md "preserve existing")

- [ ] 양식 관리 외 기존 메뉴 (대시보드 / 결재 대기 / 내 기안 문서 / 부서 관리 등) 클릭 시 정상 라우팅
- [ ] 양식 목록의 검색/필터/페이지네이션 정상 작동
- [ ] 기존 양식 (Phase 26 까지의 4 preset) 으로 작성된 과거 문서가 정상 조회됨

## Sign-Off

- [x] 모든 항목 통과 (실패 항목 없음 또는 별도 이슈 기록)
- [x] 검증자: park sang young
- [x] 검증일: 2026-04-26
- [x] 결과: **pass**
- [x] T-32-02 검증 결론: **옵션 A 확정** (DynamicTableField namespace 격리로 root title vs agenda.title 충돌 없음)
- [x] 발견된 이슈: 없음

---

*Phase: 32-custom*
*UAT draft: 2026-04-25*
*Source: 32-CONTEXT.md D-A/D-B/D-D2/D-D3, 32-VALIDATION.md Nyquist #8 Manual UAT, 32-RESEARCH.md Open Question 1 + T-32-02 mitigation*
