---
status: complete
phase: 26-convenience-features
source:
  - 26-01-SUMMARY.md
  - 26-02-SUMMARY.md
started: 2026-04-14
updated: 2026-04-14
---

## Current Test

[testing complete]

## Tests

### 1. 양식 복제 (Duplicate)
expected: 관리자 > 양식 관리에서 Copy 아이콘 클릭 시 TemplateFormModal이 "(복사본)" suffix와 빈 prefix로 프리필되어 열림
result: pass

### 2. 양식 내보내기 (Export)
expected: 관리자 > 양식 관리에서 Download 아이콘 클릭 시 `{code}-YYYYMMDD.json` 파일이 브라우저에 다운로드됨. 파일을 열어보면 exportFormatVersion=1 포함, id/code/createdBy/createdAt/isActive 제외
result: pass

### 3. 양식 추가 3-옵션 선택 모달
expected: "양식 추가" 버튼 클릭 시 TemplateCreateChoiceModal이 열리고 3개 옵션(빈 양식으로 시작 / 프리셋에서 선택 / JSON 가져오기) 카드가 표시됨
result: pass

### 4. 프리셋 갤러리에서 양식 생성
expected: 3-옵션 모달에서 "프리셋에서 선택" 클릭 → PresetGallery가 4개 카드(지출결의/휴가신청/출장/구매요청) 2x2 그리드로 표시. 카드 선택 시 TemplateFormModal이 해당 프리셋 데이터로 프리필되어 열림(prefix는 비어있음)
result: pass

### 5. 유효한 JSON 가져오기
expected: Import 모달에서 유효한 JSON(예: 이전에 Export한 파일) 업로드 시 녹색 성공 chip 표시, "가져오기" 버튼 활성화. 클릭 시 TemplateFormModal이 해당 데이터로 열림
result: pass

### 6. 잘못된 JSON 에러 표시
expected: Import 모달에서 잘못된 JSON(필수 필드 누락 등) 업로드 시 red-50 컨테이너에 필드 경로별 에러 리스트 표시. "가져오기" 버튼 비활성화
result: pass

### 7. 파일 크기/확장자 가드
expected: 1MB 초과 파일 또는 .json 외 확장자 선택 시 거부(에러 메시지), 모달이 업로드를 차단
result: pass

### 8. 기존 기능 회귀 확인
expected: 기존 "양식 추가" 빈 양식 경로, 기존 템플릿 "편집(연필 아이콘)" 경로, 활성/비활성 토글이 모두 정상 동작(회귀 없음)
result: pass

### 9. i18n (KO/EN) 표시
expected: 언어 전환 시 TemplateCreateChoiceModal/PresetGallery/ImportTemplateModal의 라벨이 한국어/영어로 각각 올바르게 표시됨
result: pass

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
