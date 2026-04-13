# Phase 25: 계산 규칙 UI — 수동 UAT 체크리스트

**Target:** 관리자 계정으로 양식 관리 → 양식 생성/편집 모달에서 검증
**Dev server:** `cd frontend && npm run dev`
**Requirements covered:** CAL-01, CAL-02
**Decisions covered:** D-01 ~ D-31

## 사전 준비

- [ ] 개발 서버 실행 후 관리자 계정 로그인
- [ ] 양식 관리 페이지 → "새 양식" 버튼 클릭
- [ ] 다음 테스트 양식 구성:
  - text 필드: 제목
  - number 필드: priceA, priceB, priceC
  - table 필드: items (컬럼: name=text, price=number, qty=number)
  - number 필드: total (계산 타겟), ratio (계산 타겟)

## 1. 프리셋 4종 동작 (CAL-01, D-14, D-15, D-16)

- [ ] **프리셋 1 — SUM(컬럼):** total 필드 계산 규칙 섹션 열고 "컬럼 합계" 선택 → items.price 선택 → 공식이 `SUM(items.price)` 로 자동 생성되는지 확인
- [ ] **프리셋 2 — SUM(컬럼×컬럼):** "컬럼 곱 합계" 선택 → items 테이블 + price × qty → `SUM(items.price * items.qty)` 생성
- [ ] **프리셋 3 — 필드합:** priceA/priceB/priceC 체크박스 다중 선택 → `priceA + priceB + priceC` 생성
- [ ] **프리셋 4 — 비율:** ratio 필드에 분자=priceA, 분모=priceB 선택 → `priceA / priceB * 100` 생성

## 2. 고급 모드 자유입력 + blur 검증 (D-17, D-26, D-27)

- [ ] total 필드를 "고급 모드" 로 전환
- [ ] `SUM(items.price * items.qty) * 1.1` 입력 → blur → 에러 없이 저장됨
- [ ] 잘못된 공식 `nonExistent + 1` 입력 → blur → `존재하지 않는 필드 참조` 표시
- [ ] 괄호 불일치 `SUM(items.price` 입력 → blur → `공식 구문 오류` 표시
- [ ] 빈 문자열 입력 → blur → `공식이 비어 있습니다` 표시
- [ ] 자기참조 `total + 1` 입력 (total 필드 편집 중) → blur → `자기 자신을 참조할 수 없습니다` 표시 (Pitfall 7)

## 3. 순환 의존성 (CAL-02, D-24)

- [ ] total 필드 → priceA 참조 설정 (예: `priceA`)
- [ ] priceA 필드의 계산 규칙 섹션 열고 → total 참조 설정 (예: `total`)
- [ ] total 필드 카드와 priceA 필드 카드 **양쪽에** 빨간 순환 경고 배너가 표시되는지 확인
- [ ] 필드 카드 헤더의 Σ 배지가 **빨간색**으로 표시되는지 확인
- [ ] 저장 버튼이 disabled 되고 hover tooltip 에 "계산 규칙에 순환 의존성이 있습니다" 표시
- [ ] 강제 클릭 시도 시 저장 실행 불가
- [ ] priceA 의 계산 규칙 삭제 → 양쪽 배너 즉시 사라짐, 저장 버튼 활성화

## 4. 저장/로드 (Pitfall 1, D-10)

- [ ] 계산 규칙 설정된 양식을 저장 (제목 등 필수값 입력 후)
- [ ] 모달 닫고 동일 양식 편집 모달 재진입
- [ ] **계산 규칙이 복원되어 Σ 배지와 공식 미리보기가 이전과 동일하게 표시되는지 확인** (Pitfall 1 회귀 검증)
- [ ] DevTools Network 탭에서 저장 요청 payload 의 `schemaDefinition` JSON 을 파싱하여 `calculationRules` 배열이 비어있지 않음을 확인

## 5. 필드 카드 Σ 배지 + 공식 미리보기 (D-25)

- [ ] 규칙 설정된 number 필드 카드 헤더에 Σ 아이콘 배지 표시
- [ ] 공식이 1줄 미리보기로 보이며, `*` 이 `×` 로, `/` 가 `÷` 로 렌더링됨 (`= SUM(items.price × items.qty)`)
- [ ] 카드가 접힌 상태에서도 배지/공식 확인 가능

## 6. 필드 삭제 cascade (D-06, D-07)

- [ ] total 필드가 items 테이블을 참조하는 상태
- [ ] items 테이블 필드 삭제 → 토스트 "계산 규칙 N개가 자동 제거되었습니다" 표시
- [ ] total 필드의 계산 규칙이 자동 제거됨 (Σ 배지 사라짐)
- [ ] total 필드 자체 삭제 → 해당 규칙 제거 + 토스트

## 7. 필드 타입 변경 cascade (D-08, Pitfall 3)

- [ ] priceA (number) 를 참조하는 ratio 규칙 설정
- [ ] priceA 필드 타입을 number → text 로 변경 → 토스트 + ratio 규칙 자동 제거
- [ ] **Pitfall 3 검증:** items 테이블의 price 컬럼 타입을 number → text 로 변경 → total 규칙 (SUM(items.price) 참조) 자동 제거 + 토스트

## 8. 미리보기 disabled + 실시간 계산 (D-29, Pitfall 2)

- [ ] 계산 규칙이 설정된 total 필드를 미리보기에서 확인
- [ ] total 입력 필드가 **disabled** 상태 (회색, 입력 불가)
- [ ] items 테이블에 row 입력 (price=100, qty=2; price=200, qty=3) → total 필드에 `800` 계산 결과 자동 표시
- [ ] row 값 변경 → total 실시간 갱신
- [ ] React DevTools Console 에 "Maximum update depth exceeded" 경고 **없음** (Pitfall 2 검증)
- [ ] 전체화면 미리보기 포털에서도 동일한 실시간 계산 동작 확인

## 9. Phase 24 회귀 검증

- [ ] admin FormPreview 에서 Phase 24 조건 규칙이 여전히 동작 (IF 필드 값 = X → 다른 필드 표시/숨김)
- [ ] 동일 양식에 조건 규칙 + 계산 규칙 동시 설정 시 둘 다 정상 동작
- [ ] 조건 규칙 필드 카드의 ⚡ 배지와 계산 규칙 필드 카드의 Σ 배지가 병렬로 표시 가능
- [ ] 기존 양식 (계산 규칙 없는) 편집/저장 동작에 회귀 없음

## 10. D-10 payload 포함 확인

- [ ] DevTools Network 탭에서 저장 요청을 inspect
- [ ] Request body 의 `schemaDefinition` (string) 을 JSON.parse 하면 다음 구조:
      ```json
      {
        "version": 1,
        "fields": [...],
        "conditionalRules": [...],
        "calculationRules": [
          { "targetFieldId": "total", "formula": "...", "dependsOn": [...] }
        ]
      }
      ```
- [ ] calculationRules 가 빈 배열이 아니며, dependsOn 이 올바르게 추출되어 있음

## 이슈 기록

발견된 이슈는 아래에 기록:

- (none)

## Sign-off

- [x] 모든 항목 통과 → "approved" 입력

**승인일:** 2026-04-13
**승인 상태:** approved — 48개 UAT 체크박스 전부 통과
**Pitfall 검증:** 1 (저장/로드 복원), 2 (무한 루프 없음), 3 (table 컬럼 타입 변경 cascade), 7 (자기참조 감지) 포함 전 항목 검증 완료
