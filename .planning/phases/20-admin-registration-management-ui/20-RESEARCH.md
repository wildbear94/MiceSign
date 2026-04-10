# Phase 20: Admin Registration Management UI - Research

**Researched:** 2026-04-08
**Domain:** React frontend -- admin CRUD UI (list + modal + actions)
**Confidence:** HIGH

## Summary

Phase 20은 SUPER_ADMIN이 등록 신청을 조회, 승인, 거부할 수 있는 관리자 페이지 구현이다. 기존 사용자 관리 UI(UserListPage, UserTable, UserFormModal)의 패턴과 거의 동일한 구조이므로, 기존 코드를 참조하여 일관성 있게 구현하면 된다.

백엔드 API(Phase 18)는 이미 완성되어 있으며, `AdminRegistrationController`가 목록 조회(`GET /api/v1/admin/registrations`), 승인(`POST /{id}/approve`), 거부(`POST /{id}/reject`) 엔드포인트를 제공한다. 프론트엔드는 이 API에 대한 API 레이어, TanStack Query 훅, 페이지/컴포넌트를 새로 만들면 된다.

주요 차이점은 (1) 필터가 드롭다운이 아닌 탭 버튼 형태, (2) 행 클릭 시 상세 페이지가 아닌 통합 모달, (3) 모달에서 승인/거부 액션이 가능한 점이다. 토스트 알림은 현재 프로젝트에 토스트 라이브러리가 없으므로, 간단한 토스트 컴포넌트를 새로 만들거나 인라인 성공 배너를 사용해야 한다.

**Primary recommendation:** 기존 UserListPage 패턴을 그대로 따르되, 탭 필터와 통합 모달(상세+승인/거부)을 새로 구현한다. 토스트는 간단한 커스텀 컴포넌트로 구현한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 탭 버튼으로 상태 필터링 -- 전체/대기중/승인/거부/만료/취소 6개 탭
- **D-02:** 기본 선택 탭: 대기중 (PENDING)
- **D-03:** 테이블 컬럼: 신청자명, 이메일, 신청일, 상태 배지. 승인/거부된 것은 처리일도 표시.
- **D-04:** 행 클릭 시 상세 통합 모달 열기
- **D-05:** 기본 정렬: 신청일 역순 (최신 먼저). 컬럼 헤더 클릭으로 정렬 변경 가능.
- **D-06:** 페이지네이션 포함 (기존 Pagination 컴포넌트 재사용)
- **D-07:** 빈 상태: 간단한 텍스트
- **D-08:** 하나의 통합 모달에 신청자 정보 + 승인/거부 액션 영역
- **D-09:** 모달 상단: 신청자 정보 (이름, 이메일, 신청일) 표시
- **D-10:** PENDING 상태일 때만 승인/거부 액션 영역 표시. 다른 상태는 읽기 전용.
- **D-11:** APPROVED 상태: 배정된 부서/직급/사원번호 표시. REJECTED 상태: 거부 사유 표시.
- **D-12:** 승인 시 입력: 부서(드롭다운), 직급(드롭다운), 사원번호(텍스트 필드). 모두 필수.
- **D-13:** 부서 선택: 간단한 드롭다운
- **D-14:** 사원번호: 수동 입력만
- **D-15:** 확인 없이 바로 승인
- **D-16:** 유효성 검증: 필수값 검증만. 사원번호 중복 검증은 백엔드.
- **D-17:** 승인 성공 후: 모달 닫고 목록 새로고침 + 성공 토스트 메시지
- **D-18:** 통합 모달 내에서 거부 버튼 클릭 시 거부 사유 텍스트에어리아 표시
- **D-19:** 거부 사유: 여러 줄 텍스트에어리아, 최소 길이 제한
- **D-20:** 거부 확인: "이 신청을 거부하시겠습니까?" 확인 다이얼로그 표시
- **D-21:** 거부 성공 후: 모달 닫고 목록 새로고침 + 성공 토스트 메시지
- **D-22:** AdminSidebar에 "등록 신청 관리" 메뉴 추가
- **D-23:** 라우트 경로: `/admin/registrations`
- **D-24:** 사이드바 메뉴에 PENDING 건수 배지 표시
- **D-25:** 기존 프로젝트 토스트 패턴 사용. 성공(녹색)/에러(빨간) 토스트.
- **D-26:** 이미 처리된 신청에 승인/거부 시도 시: 에러 토스트 + 목록 자동 새로고침.
- **D-27:** 데이터 로딩 중: 스피너 표시
- **D-28:** i18n 키 사용. admin 네임스페이스에 registration 관련 키 추가.

### Claude's Discretion
- 거부 사유 최소 길이 구체적 값 (10자 내외 적절)
- 승인/거부 버튼 스타일 (색상, 위치)
- 모달 크기 및 레이아웃 세부 디자인
- 탭 활성화 시 API 호출 최적화 (캐시, debounce 등)
- 로딩 스피너 구체적 위치 및 스타일
- 상태 배지 색상 (기존 UserTable STATUS_BADGE 패턴 참조)
- PENDING 건수 배지 API 호출 주기

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADM-01 | SUPER_ADMIN이 등록 신청 목록을 조회할 수 있다 | 탭 필터 + 테이블 + 페이지네이션 패턴. GET /api/v1/admin/registrations API 사용. |
| ADM-02 | SUPER_ADMIN이 신청을 승인하면서 부서와 직급을 지정할 수 있다 | 통합 모달에서 부서/직급/사원번호 입력 후 POST /{id}/approve 호출. |
| ADM-03 | SUPER_ADMIN이 신청을 거부하면서 거부 사유를 입력할 수 있다 | 통합 모달에서 거부 사유 입력 + ConfirmDialog 후 POST /{id}/reject 호출. |
</phase_requirements>

## Standard Stack

이 페이즈는 새 라이브러리 설치 없이 기존 스택으로 구현 가능하다.

### Core (이미 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.x | UI 프레임워크 | 프로젝트 기본 [VERIFIED: package.json] |
| TanStack Query | 5.95.x | 서버 상태 관리 | useUsers 훅 패턴 그대로 재사용 [VERIFIED: package.json] |
| React Hook Form + Zod | 7.72.x / 4.3.x | 승인 폼 유효성 검증 | UserFormModal 패턴 그대로 재사용 [VERIFIED: package.json] |
| Axios | 1.14.x | HTTP 클라이언트 | userApi 패턴 그대로 재사용 [VERIFIED: package.json] |
| react-i18next | 17.x | 다국어 | admin 네임스페이스 확장 [VERIFIED: package.json] |
| lucide-react | 1.7.x | 아이콘 | 기존 사이드바/테이블 아이콘 일관성 [VERIFIED: package.json] |
| TailwindCSS | 3.4 | 스타일링 | 프로젝트 전체 일관성 [VERIFIED: package.json] |

### 토스트 관련 결정

현재 프로젝트에는 토스트 라이브러리가 설치되어 있지 않다. [VERIFIED: package.json 전체 확인] 기존 성공/에러 피드백은 apiError 배너(인라인)와 `alert()` 호출로 처리하고 있다. [VERIFIED: UserFormModal, TemplateBuilderPage 코드 확인]

CONTEXT.md D-17, D-21, D-25에서 토스트를 명시하므로, 두 가지 옵션이 있다:

| 옵션 | 방법 | 장점 | 단점 |
|------|------|------|------|
| A: sonner 설치 | `npm install sonner` | 프로덕션 검증됨, 접근성 좋음 | 새 의존성 추가 |
| B: 커스텀 토스트 | Zustand store + Portal 기반 직접 구현 | 의존성 없음 | 직접 구현 비용, 접근성 부담 |

**Recommendation:** 옵션 A (sonner). 4KB gzipped, React 18 호환, 추가 설정 최소. 프로젝트 전체에서 향후에도 재사용 가능. [ASSUMED: sonner 사이즈 및 호환성은 훈련 데이터 기반]

## Architecture Patterns

### 프로젝트 구조 (기존 패턴 따름)
```
frontend/src/features/admin/
  api/
    registrationApi.ts        # API 레이어 (userApi.ts 패턴)
  hooks/
    useRegistrations.ts        # TanStack Query 훅 (useUsers.ts 패턴)
  components/
    RegistrationTable.tsx      # 테이블 (UserTable 패턴)
    RegistrationStatusTabs.tsx # 탭 필터 (새로운 컴포넌트)
    RegistrationDetailModal.tsx# 통합 모달 (UserFormModal 패턴 참조)
  pages/
    RegistrationListPage.tsx   # 페이지 (UserListPage 패턴)
  types/                       # 또는 src/types/admin.ts에 추가
```

### Pattern 1: API 레이어

기존 `userApi.ts` 패턴을 그대로 따른다.

```typescript
// Source: frontend/src/features/admin/api/userApi.ts (기존 패턴)
import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';

const BASE = '/admin/registrations';

export const registrationApi = {
  getList: (params: RegistrationFilterParams) =>
    apiClient.get<ApiResponse<PageResponse<RegistrationListItem>>>(BASE, { params }),

  approve: (id: number, data: ApproveRegistrationRequest) =>
    apiClient.post<ApiResponse<void>>(`${BASE}/${id}/approve`, data),

  reject: (id: number, data: RejectRegistrationRequest) =>
    apiClient.post<ApiResponse<void>>(`${BASE}/${id}/reject`, data),

  getPendingCount: () =>
    apiClient.get<ApiResponse<PageResponse<RegistrationListItem>>>(BASE, {
      params: { status: 'PENDING', size: 1 },
    }),
};
```

### Pattern 2: TanStack Query 훅

```typescript
// Source: frontend/src/features/admin/hooks/useUsers.ts (기존 패턴)
export function useRegistrationList(params: RegistrationFilterParams) {
  return useQuery({
    queryKey: ['registrations', params],
    queryFn: () => registrationApi.getList(params).then((res) => res.data.data!),
    placeholderData: (prev) => prev,
  });
}

export function useApproveRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApproveRegistrationRequest }) =>
      registrationApi.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}
```

### Pattern 3: 탭 필터 (새 패턴)

기존 UserFilterBar는 드롭다운 방식이지만, D-01에 따라 탭 버튼 형태로 구현한다.

```typescript
// 탭 컴포넌트 패턴
const TABS = [
  { key: undefined, labelKey: 'registration.tabs.all' },      // 전체
  { key: 'PENDING', labelKey: 'registration.tabs.pending' },
  { key: 'APPROVED', labelKey: 'registration.tabs.approved' },
  { key: 'REJECTED', labelKey: 'registration.tabs.rejected' },
  { key: 'EXPIRED', labelKey: 'registration.tabs.expired' },
  { key: 'CANCELLED', labelKey: 'registration.tabs.cancelled' },
] as const;
```

### Pattern 4: 통합 모달 상태 관리

모달은 한 컴포넌트에서 세 가지 모드를 처리한다:
1. **PENDING**: 신청자 정보 + 승인/거부 액션 영역
2. **APPROVED**: 신청자 정보 + 배정 정보 (읽기 전용)
3. **REJECTED**: 신청자 정보 + 거부 사유 (읽기 전용)
4. **EXPIRED/CANCELLED**: 신청자 정보만 (읽기 전용)

모달 내부에서 "거부" 버튼 클릭 시 거부 사유 textarea가 나타나는 UI 전환이 필요하다.

```typescript
// 모달 내부 상태
type ModalMode = 'view' | 'reject'; // view: 기본, reject: 거부 사유 입력 중
const [mode, setMode] = useState<ModalMode>('view');
```

### Pattern 5: AdminSidebar 배지

PENDING 건수 배지를 위해 사이드바에서 TanStack Query를 사용한다.

```typescript
// AdminSidebar.tsx에서 배지 표시
// navItems를 동적으로 만들거나, 배지를 별도로 렌더링
// PENDING 건수는 목록 API에 status=PENDING&size=1 호출 후 totalElements 사용
```

### Anti-Patterns to Avoid
- **승인/거부를 별도 모달로 분리하지 말 것:** D-08에서 통합 모달로 결정됨.
- **AdminRoute 수준 접근 제어에 의존하지 말 것:** AdminRoute는 ADMIN+SUPER_ADMIN 모두 통과시킴. 등록 관리는 SUPER_ADMIN 전용이므로, 추가 가드가 필요할 수 있음. 단, 백엔드 API에서 `@PreAuthorize("hasRole('SUPER_ADMIN')")` 처리가 되어 있으므로 UI에서는 사이드바 메뉴 노출 제어만으로 충분.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 토스트 알림 | 커스텀 토스트 시스템 (portal, timer, 접근성) | sonner 또는 매우 간단한 커스텀 | 접근성(aria-live), 자동 닫기, 스택 관리 등 복잡도 |
| 페이지네이션 | 새 Pagination 컴포넌트 | 기존 `Pagination` 컴포넌트 | 이미 완성됨 [VERIFIED: Pagination.tsx] |
| 확인 다이얼로그 | 새 다이얼로그 | 기존 `ConfirmDialog` 컴포넌트 | focus trap, ESC 처리 포함 [VERIFIED: ConfirmDialog.tsx] |
| 폼 유효성 검증 | 수동 validation | React Hook Form + Zod | 이미 프로젝트 표준 [VERIFIED: UserFormModal.tsx] |

## Common Pitfalls

### Pitfall 1: PENDING 건수 배지 과도한 API 호출
**What goes wrong:** 사이드바가 모든 admin 페이지에서 렌더링되므로, 페이지 전환마다 PENDING 건수 API가 호출됨
**Why it happens:** TanStack Query의 staleTime 기본값이 0이므로 컴포넌트 마운트마다 refetch
**How to avoid:** staleTime을 30초~1분으로 설정하여 불필요한 재요청 방지
**Warning signs:** Network 탭에서 admin 페이지 전환 시 매번 요청 발생

### Pitfall 2: 이미 처리된 신청에 대한 race condition
**What goes wrong:** SUPER_ADMIN A가 모달을 열어둔 상태에서 다른 관리자가 이미 처리함. 승인/거부 시 서버에서 에러 응답.
**Why it happens:** 모달이 열려있는 동안 데이터가 stale해짐
**How to avoid:** D-26에 따라 에러 토스트 + 목록 자동 새로고침 처리. 백엔드가 상태 불일치 시 에러를 반환하므로 프론트에서 에러 코드별 처리.
**Warning signs:** REGISTRATION_ALREADY_PROCESSED 에러 코드

### Pitfall 3: AdminSidebar SUPER_ADMIN 전용 메뉴 노출
**What goes wrong:** ADMIN 역할 사용자에게도 등록 관리 메뉴가 노출됨
**Why it happens:** AdminRoute는 ADMIN+SUPER_ADMIN 모두 통과. [VERIFIED: AdminRoute.tsx -- `user.role === 'USER'` 체크만 함]
**How to avoid:** AdminSidebar에서 등록 관리 메뉴 항목에 role 조건 추가. `useAuthStore`에서 현재 사용자 role 확인.
**Warning signs:** ADMIN 역할로 로그인 시 사이드바에 등록 관리 메뉴 표시

### Pitfall 4: 승인 모달에서 부서/직급 데이터 미로딩
**What goes wrong:** 승인 시 부서/직급 드롭다운이 비어있음
**Why it happens:** 모달이 열릴 때 부서/직급 데이터를 fetch하지 않으면 초기 렌더에 옵션이 없음
**How to avoid:** RegistrationListPage에서 `useDepartmentTree`, `usePositions` 훅을 호출하고 모달에 props로 전달 (UserListPage 패턴과 동일)
**Warning signs:** 모달 열릴 때 드롭다운 옵션 없음

## Code Examples

### Backend API 계약 (Phase 18 완료)

```java
// Source: AdminRegistrationController.java [VERIFIED: 실제 코드 확인]

// GET /api/v1/admin/registrations?status=PENDING&page=0&size=20&sort=createdAt,desc
// Response: ApiResponse<Page<RegistrationListResponse>>

// POST /api/v1/admin/registrations/{id}/approve
// Body: { "employeeNo": "EMP001", "departmentId": 1, "positionId": 2 }

// POST /api/v1/admin/registrations/{id}/reject
// Body: { "rejectionReason": "불충분한 정보입니다." }
```

### Backend DTO 구조

```java
// Source: RegistrationListResponse.java [VERIFIED]
record RegistrationListResponse(
    Long id,
    String name,
    String email,
    RegistrationStatus status,  // PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED
    String rejectionReason,     // nullable
    LocalDateTime createdAt,
    LocalDateTime processedAt   // nullable
)

// Source: ApproveRegistrationRequest.java [VERIFIED]
record ApproveRegistrationRequest(
    @NotBlank @Size(max = 20) String employeeNo,
    @NotNull Long departmentId,
    @NotNull Long positionId
)

// Source: RejectRegistrationRequest.java [VERIFIED]
record RejectRegistrationRequest(
    @NotBlank @Size(max = 500) String rejectionReason
)
```

### TypeScript 타입 정의

```typescript
// frontend/src/types/admin.ts에 추가
export interface RegistrationListItem {
  id: number;
  name: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  rejectionReason: string | null;
  createdAt: string;    // ISO datetime
  processedAt: string | null;
}

export interface ApproveRegistrationRequest {
  employeeNo: string;
  departmentId: number;
  positionId: number;
}

export interface RejectRegistrationRequest {
  rejectionReason: string;
}

export interface RegistrationFilterParams {
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}
```

### 상태 배지 색상 패턴

```typescript
// UserTable STATUS_BADGE 패턴 참조 [VERIFIED: UserTable.tsx]
const REG_STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};
```

### 라우터 등록

```typescript
// App.tsx에 추가 [VERIFIED: 기존 라우터 구조 확인]
// AdminLayout 하위에:
<Route path="registrations" element={<RegistrationListPage />} />
```

### AdminSidebar 메뉴 추가

```typescript
// AdminSidebar.tsx [VERIFIED: 기존 navItems 구조]
// navItems 배열에 추가 (Users 아래):
{ to: '/admin/registrations', icon: UserPlus, label: '등록 신청 관리' }
// 단, SUPER_ADMIN 전용이므로 조건부 렌더링 필요
```

### i18n 키 구조

```json
// frontend/public/locales/ko/admin.json에 추가
{
  "registration": {
    "title": "등록 신청 관리",
    "tabs": {
      "all": "전체",
      "pending": "대기중",
      "approved": "승인",
      "rejected": "거부",
      "expired": "만료",
      "cancelled": "취소"
    },
    "table": {
      "name": "신청자명",
      "email": "이메일",
      "createdAt": "신청일",
      "processedAt": "처리일",
      "status": "상태"
    },
    "modal": {
      "title": "등록 신청 상세",
      "applicantInfo": "신청자 정보",
      "assignInfo": "배정 정보",
      "employeeNo": "사원번호",
      "department": "부서",
      "position": "직급",
      "rejectionReason": "거부 사유",
      "rejectionReasonPlaceholder": "거부 사유를 입력해주세요 (10자 이상)"
    },
    "action": {
      "approve": "승인",
      "reject": "거부",
      "confirmReject": "거부 확인",
      "rejectConfirmTitle": "신청 거부",
      "rejectConfirmMessage": "이 신청을 거부하시겠습니까?"
    },
    "status": {
      "PENDING": "대기중",
      "APPROVED": "승인",
      "REJECTED": "거부",
      "EXPIRED": "만료",
      "CANCELLED": "취소"
    },
    "emptyList": "등록 신청이 없습니다.",
    "pendingCount": "{{count}}"
  },
  "toast": {
    "registrationApproved": "등록 신청이 승인되었습니다.",
    "registrationRejected": "등록 신청이 거부되었습니다."
  }
}
```

## Project Constraints (from CLAUDE.md)

- React 18 + Vite + TypeScript 프론트엔드 스택 [VERIFIED]
- Zustand (client state) + TanStack Query v5 (server state) [VERIFIED]
- TailwindCSS 스타일링 [VERIFIED]
- GSD workflow를 통해서만 파일 변경 [VERIFIED]
- i18n 사용 필수 (한국어 기본) [VERIFIED]
- JWT Auth: SUPER_ADMIN/ADMIN/USER RBAC [VERIFIED]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 프론트엔드 테스트 프레임워크 미설치 |
| Config file | none |
| Quick run command | N/A |
| Full suite command | `npm run build` (TypeScript 컴파일 체크만) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADM-01 | 등록 신청 목록 조회 | manual | 브라우저에서 /admin/registrations 접근 | -- Wave 0 |
| ADM-02 | 신청 승인 (부서/직급 지정) | manual | 브라우저에서 PENDING 신청 승인 시도 | -- Wave 0 |
| ADM-03 | 신청 거부 (사유 입력) | manual | 브라우저에서 PENDING 신청 거부 시도 | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npm run build` (TypeScript 컴파일 검증)
- **Per wave merge:** 수동 브라우저 테스트
- **Phase gate:** TypeScript 빌드 성공 + 수동 기능 테스트

### Wave 0 Gaps
- 프론트엔드 단위 테스트 프레임워크 미설치 (Vitest/Jest). 이 페이즈에서 설치할 필요 없음. TypeScript 컴파일 검증으로 충분.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | JWT 기존 구현 (Phase 2) |
| V3 Session Management | no | 기존 구현 |
| V4 Access Control | yes | AdminRoute(ADMIN+SUPER_ADMIN) + 사이드바 메뉴 SUPER_ADMIN 조건부 렌더링 + 백엔드 @PreAuthorize |
| V5 Input Validation | yes | React Hook Form + Zod (승인 폼), textarea minLength (거부 사유) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ADMIN 사용자의 등록 관리 접근 | Elevation of Privilege | 사이드바 조건부 렌더링 + 백엔드 SUPER_ADMIN 체크 |
| 이미 처리된 신청 재처리 | Tampering | 백엔드 상태 체크 + 프론트 에러 처리 (D-26) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | sonner 토스트 라이브러리 추천 (4KB, React 18 호환) | Standard Stack | 사이즈나 호환성이 다를 수 있음. npm view로 검증 필요. 대안: react-hot-toast 또는 커스텀 구현 |
| A2 | RegistrationListResponse에 승인 시 배정된 부서/직급/사원번호 정보 미포함 | Code Examples | D-11에서 APPROVED 상태 시 배정 정보 표시를 요구하지만, 현재 DTO에는 해당 필드 없음. 별도 상세 API가 필요하거나 DTO 확장 필요. |

## Open Questions

1. **APPROVED 상태에서 배정 정보 표시**
   - What we know: D-11에서 "APPROVED 상태: 배정된 부서/직급/사원번호 표시" 요구. 그러나 `RegistrationListResponse` DTO에는 이 정보가 없다. [VERIFIED: RegistrationListResponse.java]
   - What's unclear: 백엔드에서 상세 조회 API가 별도로 있는지, 또는 목록 응답에 추가할지
   - Recommendation: RegistrationListResponse에 `employeeNo`, `departmentName`, `positionName` 필드를 추가하는 소규모 백엔드 수정이 필요할 수 있다. 또는 승인된 신청의 경우 user 테이블에서 조회 가능하므로 DTO에 optional 필드로 추가하는 것이 적절.

2. **토스트 구현 방식**
   - What we know: 프로젝트에 토스트 라이브러리가 없다. D-17, D-21, D-25에서 토스트를 요구한다.
   - What's unclear: 외부 라이브러리 설치가 허용되는지, 커스텀 구현을 선호하는지
   - Recommendation: sonner 설치를 기본으로 하되, 사용자가 거부하면 간단한 커스텀 토스트(Zustand store + fixed position div) 구현

## Sources

### Primary (HIGH confidence)
- `AdminRegistrationController.java` -- API 엔드포인트 구조 확인
- `ApproveRegistrationRequest.java`, `RejectRegistrationRequest.java`, `RegistrationListResponse.java` -- DTO 구조 확인
- `RegistrationStatus.java` -- enum 값 확인 (PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED)
- `UserListPage.tsx` -- 목록 페이지 패턴
- `UserTable.tsx` -- 테이블 + 상태 배지 패턴
- `UserFormModal.tsx` -- 모달 + React Hook Form + Zod 패턴
- `useUsers.ts` -- TanStack Query 훅 패턴
- `userApi.ts` -- API 레이어 패턴
- `AdminSidebar.tsx` -- 사이드바 네비게이션 구조
- `ConfirmDialog.tsx` -- 확인 다이얼로그 컴포넌트 (props 인터페이스 확인)
- `Pagination.tsx` -- 페이지네이션 컴포넌트 (props 인터페이스 확인)
- `AdminRoute.tsx` -- 접근 제어 로직 (ADMIN+SUPER_ADMIN 통과)
- `App.tsx` -- 라우터 구조
- `package.json` -- 설치된 의존성 전체 확인
- `admin.json` (i18n) -- 기존 i18n 키 구조
- `config.ts` (i18n) -- 네임스페이스 구조 (admin NS 확인)

### Secondary (MEDIUM confidence)
- 없음

### Tertiary (LOW confidence)
- sonner 라이브러리 사이즈/호환성 (훈련 데이터 기반)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 새 라이브러리 없이 기존 스택 활용 (토스트 제외)
- Architecture: HIGH -- 기존 UserListPage/UserTable/UserFormModal 패턴 직접 확인
- Pitfalls: HIGH -- AdminRoute 접근 제어, race condition 등 실제 코드 기반 분석

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (안정적인 프론트엔드 패턴, 변경 가능성 낮음)
