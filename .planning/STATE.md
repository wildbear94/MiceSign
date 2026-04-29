---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: phases
status: executing
stopped_at: Phase 34-02 complete — UserProfileDto extended for DRAFT-mode header data source
last_updated: "2026-04-29T06:05:30.958Z"
last_activity: 2026-04-29
progress:
  total_phases: 15
  completed_phases: 5
  total_plans: 33
  completed_plans: 30
  percent: 91
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Core value:** Employees can submit approval documents and get them approved/rejected through a clear, sequential workflow
**Current focus:** Phase 34 — drafter-info-header

## Current Position

Phase: 34 (drafter-info-header) — EXECUTING
Plan: 4 of 6
Status: Ready to execute
Last activity: 2026-04-29

Progress: [█████████░] 91%

**Archive 결정 (2026-04-28):** `defer-archive` 채택

- 사유: AUDIT.md §G5/§G6/§5 의 RELEASE-DEFERRED 패턴과 정합 — 실 출시 + 운영 안정화 후 archive 시점 동기화
- 트리거: 출시 일자 결정 + 1-2주 운영 모니터링 무이슈 → `/gsd-complete-milestone v1.2`
- v1.3 신규 milestone 시작은 archive 시점 또는 그 이후 별도 `/gsd-new-milestone`

**Phase 33 종결 요약:**

- 33-01 — application-prod.yml 자격증명 위생 (4 commits)
- 33-02 — SMTP-RUNBOOK.md 480 lines (3 commits)
- 33-03 — MONITORING.md 450 lines (2 commits)
- 33-04 — AUDIT.md 436 lines (4 commits, RELEASE-DEFERRED for Task 4)
- 33-05 — wrap-up verification + ROADMAP/STATE/VALIDATION (this plan)
- 산출물 위치: `.planning/milestones/v1.2/{SMTP-RUNBOOK,MONITORING,AUDIT}.md`
- 축소 scope (D-S1) — NFR-01 합성 부하 실측은 운영 모니터링 게이트로 이관 (`MONITORING.md §3` + `AUDIT.md §2-A`)

**Deferred 항목 인계 (release-time):**

- NFR-01 → MONITORING.md (3 신호 발동 시 재실측: SearchBenchmarkSeeder + bench-search.sh)
- stale PENDING / NOTIF FAILED 주간 점검 → SMTP-RUNBOOK.md §6
- secret manager / APM → v1.3 또는 50→200 확장 시점
- 5종 smoke + audit_log SQL sign-off → AUDIT.md §G5/§G6 (release-time gate, unchecked 보존)
- 출시 결정 메타데이터 → AUDIT.md §5 (출시 시점 작성)

## Performance Metrics

**Velocity:**

- Total plans completed: 34 (v1.0 + v1.1)
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 09 | 3 | - | - |
| 05 | 3 | - | - |
| 21 | 1 | - | - |
| 22 | 2 | - | - |
| 23 | 2 | - | - |
| 24.1 | 5 | - | - |
| 28 | 2 | - | - |
| 29 | 5 | - | - |
| 31 | 6 | - | - |
| 30 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 21 P01 | 158s | 2 tasks | 9 files |
| Phase 25 P01 | 6 min | 2 tasks | 5 files |
| Phase 25 P02 | 10 min | 3 tasks | 5 files |
| Phase 25 P03 | 20 min | 3 tasks | 4 files |
| Phase 26 P01 | 5 min | 4 tasks | 13 files |
| Phase 26 P02 | 8 min | 4 tasks | 7 files |
| Phase 31 P31-01 | 3 min | 3 tasks tasks | 5 files files |
| Phase 31 P06 | 3 min | 3 tasks | 4 files |
| Phase 31 P31-02 | 8 min | 3 tasks tasks | 4 files files |
| Phase 31 P31-03 | 6 min | 3 tasks tasks | 3 files files |
| Phase 31 P31-05 | 172 | 3 tasks | 5 files |
| Phase 31 P31-04 | 5 min | 3 tasks | 7 files |
| Phase 32 P32-01 | 1m 26s | 1 tasks | 1 files |
| Phase 32 P32-02 | 1m 19s | 1 tasks | 1 files |
| Phase 32 P32-03 | 1m 28s | 1 task tasks | 1 file files |
| Phase 32 P32-04 | 0m 43s | 1 tasks | 1 files |
| Phase 32 P32-05 | 1m 16s | 1 tasks tasks | 1 files files |
| Phase 33 P01 | 1m 26s | 3 tasks tasks | 3 files files |
| Phase 33 P02 | 6m 16s | 2 tasks tasks | 1 file files |
| Phase 33 P03 | 5min | 1 tasks | 1 files |
| Phase 34 P01 | 2m 32s | 2 tasks tasks | 2 files files |
| Phase 34 P02 | 2m 11s | 2 tasks | 3 files |
| Phase 34 P03 | 5m 34s | 2 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 24.1 inserted after Phase 24: 사용자 측 동적 폼 렌더러 - CUSTOM 템플릿으로 기안 작성/조회를 위한 DynamicFormRenderer 구현 (URGENT)
- v1.2 roadmap appended 2026-04-22: Phases 29-33 (SMTP/Search/Dashboard/Forms/E2E)
- Phase 34 added 2026-04-29: 양식 기안자 정보 헤더 자동 채움 — 모든 양식 헤더에 부서/직위(직책)/기안자명/기안일 SUBMITTED snapshot 표시. document_content JSON 에 drafterSnapshot 키 저장 (Flyway 불필요). v1.2 ship-ready 이후 추가, archive 시점 결정에 영향 없음 (Phase 32 와 독립 병행)

### Decisions

- [Roadmap v1.1]: 6 phases derived from 15 requirements, all frontend-only
- [Roadmap v1.1]: Refactor SchemaFieldEditor first (Phase 21) before adding features to prevent bloat
- [Roadmap v1.1]: Preview before rules (Phase 22 before 24/25) for visual feedback during development
- [Roadmap v1.1]: Table columns before rules (Phase 23 before 24/25) so rules can reference columns
- [Roadmap v1.1]: Convenience features last (Phase 26) — no dependencies on rules, operates on completed templates
- [Phase 21]: Kept FieldConfigEditor at 210 lines with switch structure intact rather than artificially splitting
- [Roadmap v1.2]: v1.2 는 retrofit/wiring 마일스톤 — 인프라 70% 이미 스캐폴딩되어 있으며 백엔드 신규 의존성 zero
- [Roadmap v1.2]: Phase 29(SMTP) 먼저 — 함정 밀도 최고 + 내부 의존 체인. PENDING-first 로깅 패턴 확립이 다른 phase 설계의 기준
- [Roadmap v1.2]: Phase 30 의 SRCH-01(권한 WHERE 절) 은 **운영 중 보안 사고** 이므로 Phase 30 첫 PR 로 조기 착수
- [Roadmap v1.2]: 대시보드(Phase 31) + 프리셋(Phase 32) 경량 — SMTP/검색 번인 사이 휴식 사이클
- [Roadmap v1.2]: 양식 확장은 하드코딩 없이 CUSTOM 프리셋 JSON 만으로 — v1.1 빌더/렌더러/스냅샷 불변성 자산 재활용
- [Roadmap v1.2]: MariaDB FULLTEXT/ngram/Elasticsearch 배제 — 50 user × <10K 문서 규모에서 LIKE + 기존 인덱스로 1초 NFR 충족
- [Phase 31-01]: DashboardSummaryResponse 6-arg backward-compat secondary constructor 로 Plan 01 단독 적용 시 DashboardService 무수정 컴파일 보장 — Plan 02 에서 7-arg canonical 로 전환
- [Phase 31-01]: DepartmentRepository.findDescendantIds 를 MariaDB native WITH RECURSIVE CTE 로 구현 — D-A6/A9 Option 1 공용 SoT (Plan 02 대시보드 + Plan 06 검색 권한 predicate)
- [Phase 31-01]: UserRepository.findIdsByDepartmentIdIn 은 UserStatus 필터 없음 (D-A7) — ACTIVE/INACTIVE/RETIRED 모두 포함하여 ADMIN 스코프 과거 기안 문서 카운트 반영
- [Phase 31-06]: D-A9 Option 1 채택 — DocumentRepositoryCustomImpl 3곳 predicate 를 descendantDeptIds 기반 in-절로 upgrade. SoT 통일로 대시보드(Plan 02)와 검색(Phase 30) drafter 집합 정합성 보장
- [Phase 31-06]: descendantDeptIds null/empty 시 단일 부서 eq fallback — Phase 30 backward-compat 보존, USER/SUPER_ADMIN 무영향
- [Phase 31-06]: WITH RECURSIVE dept_tree(id) AS — 컬럼 리스트 명시 표준 (H2 호환 + MariaDB 유효). Plan 01 의 CTE 가 H2 에서 syntax error 발생하던 문제 fix
- [Phase 31-02]: DashboardService 3-arg role-based 시그니처 확정 (userId, UserRole, departmentId) + switch(role) 분기 — USER/ADMIN/SUPER_ADMIN 모든 경로 sentinel List 패턴 (null=전사, empty=0, non-empty=IN)
- [Phase 31-02]: CustomUserDetails.getRole() String 유지 (security 무수정) + Controller 에서 UserRole.valueOf 파싱 — enum 전환 책임 계층 분리
- [Phase 31-02]: recentPending/recentDocuments 는 role 불문 본인 userId 스코프 — RESEARCH A6 결정 준수 (ADMIN 대시보드에서도 '내가 처리할 / 내가 기안한' 의미 보존)
- [Phase 31-02]: H2 row-by-row FK 검사 대응 — 부서 계층 DELETE 는 leaf→root 개별 문 (Plan 06 CTE 보정에 이은 H2/MariaDB 호환 패턴 2건째)
- [Phase 31-03]: DashboardSummary.rejectedCount required non-optional — BE canonical constructor 가 long primitive 로 항상 채우므로 undefined 가드 불필요 (RESEARCH A7)
- [Phase 31-03]: useDashboard 3훅 → useDashboardSummary 단일 훅으로 통합 + placeholderData (prev)=>prev 패턴 적용 — 3위젯 isLoading 자동 동기화 (D-C5) + invalidate 1회 waterfall 해소 (D-B6)
- [Phase 31-03]: queryKey ['dashboard','summary'] 기존값 보존 — Plan 05 invalidateQueries({queryKey:['dashboard']}) prefix match 로 1 호출 무효화. drafts orphan key 삭제 금지 (D-A3)
- [Phase 31-05] D-B3 4 mutation 훅 (useApprove/useReject/useSubmitDocument/useWithdrawDocument) onSuccess 에 ['dashboard'] prefix invalidate 추가 — Plan 03 단일 useDashboardSummary (queryKey ['dashboard','summary']) 와 prefix match 로 페이지 이동 없이 실시간 갱신 완성
- [Phase 31-05] D-B3 scope 외 4 훅 (useCreate/useUpdate/useDelete/useRewrite) 미변경 — DRAFT 단계 작업으로 대시보드 4카드 (pending/submitted/completed/rejected) 영향 zero. spy test 가 'useCreateDocument 는 dashboard invalidate 하지 않음' 케이스로 scope 경계 regression 방어
- [Phase 31-05] FE invalidate spy 테스트 패턴 확립 — vi.spyOn(queryClient, 'invalidateQueries') + renderHook + QueryClientProvider wrapper. 향후 mutation 훅 수정 시 invalidate 누락/추가 자동 검증 가능
- [Phase 31-04] DashboardPage drafts 카드 제거 + 4 카드 (Clock/Hourglass/CheckCircle2/XCircle, blue/gray/green/red-500) + grid lg:grid-cols-4 — D-A1/A3/C3/C4 동시 처리. role-based statusPath helper inline (USER → /documents/my, ADMIN/SUPER_ADMIN → /documents?tab=search) D-A8 적용
- [Phase 31-04] ErrorState 공통 컴포넌트 — variant card/list 분기, refetchQueries(['dashboard']) (invalidate 가 아닌 즉시 네트워크 호출), AlertTriangle + role=alert/aria-live + aria-busy + Loader2 spinner. CountCard isError prop + focus-visible:ring-2 + aria-label 패턴 (UI-SPEC §9.1, §9.4)
- [Phase 31-04] PendingList/RecentDocumentsList props-based 리팩터로 Plan 03 SUMMARY 의 'Known Consuming-Side Errors' (TS2305 4건) 해소 — useDashboardSummary 단일 훅 호출 → DashboardPage 가 recentPending/recentDocuments 평평한 배열을 props drill. data.content.length → data.length 변경
- [Phase 31-04] vitest 6/6 (DashboardPage 3 + ErrorState 3) green, tsc --noEmit PASS, vite build PASS — Phase 31 의 모든 코드 작업 완료. Human UAT 만 남음
- [Phase 32-01] meeting.json prefix=MTG / category=general / icon=Users (D-A2/A3/A4) — 신규 카테고리 키 도입 안 함, lucide-react 표준 export 사용
- [Phase 32-01] agenda.columns[1].id='title' 옵션 A 채택 — DynamicTableField path namespace 분리 보장 (T-32-02 mitigation), 향후 calculationRule 도입 시 옵션 B (subject rename) 재고
- [Phase 32-01] presets.test.ts length=4/keys=[4] 단언 일시 fail 은 의도된 게이트 — Plan 05 에서 length=6 + keys=[6] 동시 업데이트 예정. 핵심 단언 (Zod .strict() 통과, 한국어 이름) 모두 PASS
- [Phase 32-02] proposal.json prefix=PRP / category=general / icon=FileSignature (D-B2/B3/B4) — 4 fields (title text + 3 textarea config.maxLength=2000), 첨부 필드 schema 미포함 (D-B6) per document_attachment 위임
- [Phase 32-02] textarea config.placeholder Discretion 적용 (3 textarea 각각 한국어 가이드 텍스트) — UX 가이드로 작성자 인지 부담 감소, fieldConfigSchema 가 placeholder optional 허용
- [Phase 32-02] Wave 1 peer 무충돌 검증 — 32-01 (meeting.json) + 32-02 (proposal.json) 둘 다 신규 파일 추가, 동일 파일 수정 0건. presets.test.ts length/keys 단언 일시 fail 은 Plan 05 일괄 해소 예정 (Plan 01 과 동일 게이트)
- [Phase 32-03] PresetGallery.tsx 의 3 위치 (import/ICON_MAP/I18N_MAP) 동시 atomic 수정 — 단일 파일 6 줄 추가, 단일 commit. 분할 시 중간 상태 (ICON_MAP entry 추가 후 lucide import 미추가) 가 컴파일 실패로 노출 — bisect 안전성 보장
- [Phase 32-03] lucide-react Users + FileSignature 표준 export 확정 (RESEARCH Open Question 2 해소) — dist/lucide-react.d.ts grep 으로 export {} 블록 직접 확인. fallback (FilePenLine/ClipboardCheck) 미사용
- [Phase 32-03] grid-cols-2 / max-w-3xl / max-h-[80vh] 무수정 (D-C3) + presets/index.ts localeCompare sort 무수정 (D-C4) — 6 카드 = 3행×2열 자동 스크롤, 알파벳 정렬 자동 (expense→leave→meeting→proposal→purchase→trip). 신규 코드/sortOrder 도입 0건
- Phase 32 Plan 04: ko/admin.json 의 4 신규 i18n 키 (presetMeetingName/Desc, presetProposalName/Desc) 추가 — PresetGallery I18N_MAP 와 1:1 매칭, en/admin.json 무수정 (D-E2 한국어 only)
- [Phase 32-05] presets.test.ts 9 단언 게이트 (length=6/keys=6entry+meeting 5 fields+proposal 4 fields/preserve 5) — Wave 1 의도된 fail 일괄 해소, vitest+tsc+build 모두 PASS
- [Phase 32-05] 신규 단언 형식 = 기존 preset-specific 단언 100% mimicking (find!+toHaveLength+map(f=>f.id)+toEqual) — 향후 preset 추가 시 동일 답습 패턴 확립
- [Phase 33-01] application-prod.yml hardcoded DB default 제거 + .example 카탈로그 + .env.production gitignore — D-C1 1단계 (소스/설정 위생) 완결, 2-5단계는 33-02 SMTP-RUNBOOK 운영 시점
- [Phase 33-02] SMTP-RUNBOOK.md (480 lines, 6 섹션) — D-M1 사내 릴레이 + D-M2 markdown 체크리스트 + D-M3 5종 smoke 결정 실행. 사내 IT 와 §1 만 발췌 공유 가능. 33-04 AUDIT.md 출시 게이트 체크리스트의 source.
- [Phase 33-02] D-D2 BaseUrlGuard 2-게이트 grep PASS 패턴 (게이트 1: 로그 존재 / 게이트 2: localhost 부재) — Phase 29 fail-fast listener 의 운영 절차 fail-fast 게이트로 활용. localhost 가 메일 본문에 새는 사고를 startup 시점에 차단.
- [Phase 33-02] D-A11 stale PENDING 수동 FAILED 전환 SQL + D-B6 NOTIF FAILED 주간 조회 SQL 인계 흡수 — Phase 29 가 자동화 거절한 두 항목을 §6.2/§6.3 수동 운영 SQL 로 보완. 50인 환경에서 cron/push 알림 미도입 결정의 실행 가능성 입증.
- [Phase 33-02] D-C2 secret 도구 미도입 inline 메모 (§2 인트로) — systemd EnvironmentFile + chmod 600 충분, Vault/SOPS/git-crypt/AWS Secrets Manager 거절. 50인 → 200인 확장 또는 v2 시점에 재검토.
- Phase 33-03 D-S2: NFR-01 운영 모니터링 게이트 — 3 신호 (사용자 신고 / slow_query_log >1s / active_users >=30) + Plan 30-05 인프라 (SearchBenchmarkSeeder + bench-search.sh) 재활용 절차를 MONITORING.md (450 lines) 에 자기완결적으로 문서화. SMTP-RUNBOOK §6.4 와 cross-reference 분리.
- [Phase 33-04] AUDIT.md (436 lines, 6 섹션) — §0 요약 + §1 17 SC 매트릭스 + §2 5 Deferred + §3 21 Requirements 매핑 + §4 9 출시 게이트 + §5 출시 결정 placeholder. RELEASE-DEFERRED for Task 4 (사용자 결정 2026-04-28): 5종 smoke + audit_log SQL sign-off 는 phase 종결 gate 가 아닌 release-time gate 로 보존 — D-M3 ('출시 전 1회 수동 smoke') 정의 및 Plan 30-05 deferral 패턴과 정합.
- [Phase 33-04] release-time gate vs phase-completion gate 분리 패턴 확립 — wrap-up phase 의 deliverable 은 'gate 정의 + 절차 문서화' 이며 gate 통과 마킹은 출시 시점에 별도 수행. AUDIT.md §G5/§G6/§5 placeholder 가 unchecked 보존되며 출시 담당자가 SMTP-RUNBOOK §5 절차 후 직접 마킹.
- [Phase 33-05] Phase 33 종결 verification + ROADMAP/STATE/VALIDATION 갱신 — 33-01~04 산출물 grep 검증 PASS (4 산출물 + cross-reference 무결성), ROADMAP Phase 33 [x] + 5/5 + 2026-04-28, STATE v1.2 ship-ready 상태, 33-VALIDATION.md (doc-only Nyquist) 작성. archive 시점은 Task 6 사용자 결정 대기 (archive-now / defer-archive / archive-after-32).
- [Phase Phase 34-01]: DocumentDetailResponse FE 타입을 backend flat record (drafterName/departmentName/positionName) 와 정합 + DocumentDetailPage L228 doc.drafter.name → doc.drafterName 정정 — D-G1/G2/G3 latent bug atomic 분리, 후속 plan 34-04/34-05 헤더 통합이 type-correct base 위에서 진행 가능
- [Phase ?]: [Phase 34-02] UserProfileDto extended (departmentName + positionName, both nullable) — single SoT for login + refresh responses; AuthService.buildUserProfile null-safe LAZY join replicates DocumentMapper L21~24 pattern; class-level @Transactional (L26) covers LAZY safety, no per-method retrofit needed.
- [Phase ?]: Phase 34-03: Backend snapshot capture in DocumentService.submitDocument with D-C7 transaction-rollback (rejects audit-log swallow pattern)
- [Phase ?]: Phase 34-03: Test C immutability uses /withdraw because /approve is not yet implemented (Phase 7 deferred)
- [Phase ?]: Phase 34-03: Added V18 test migration to align H2 user.position_id with production NULL constraint

### Pending Todos

None yet.

### Blockers/Concerns

- **운영 SMTP 공급자 결정 보류:** 사내 릴레이 / Gmail Workspace / O365 / SES 중 선택 필요 (Phase 29 진입 전 확정)
- **`app.base-url` 운영 프로필 값 확인:** `application-prod.yml` 이 localhost 로 돼 있으면 이메일 링크 깨짐 (Phase 29 전 점검)
- **MailHog vs Mailpit 선택:** 동등, 로컬 환경에 설치된 것 선호 (Phase 29 전 결정)

## Session Continuity

Last session: 2026-04-29T06:05:30.953Z
Stopped at: Phase 34-02 complete — UserProfileDto extended for DRAFT-mode header data source
Resume file: None

**Planned Phase:** 32 (custom) — 6 plans — 2026-04-25T10:37:34.637Z

**v1.2 ship-ready checkpoint (2026-04-28):**

- 5/5 phase 중 4 종결 (29/30/31/33), Phase 32 만 잔여 (별도 일정)
- 출시 게이트 9개 정의 완료 (AUDIT.md §4) — release-time 마킹 대기 항목 8개 (G5.1-5/G6.1-2/§5.1-3)
- 다음 액션: 사용자 archive 시점 결정 (Plan 33-05 Task 6 checkpoint:decision)
