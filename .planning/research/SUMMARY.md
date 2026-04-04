# Project Research Summary

**Project:** MiceSign v1.2 — Custom Template Builder
**Domain:** Drag-and-drop form builder for Korean corporate electronic approval system
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

MiceSign v1.2 adds admin-configurable form templates to an existing, live electronic approval system. The project is an extension to a working product — not a greenfield build — which fundamentally shapes every architectural decision. The central challenge is not "how to build a form builder" but "how to build a form builder on top of 6 hardcoded templates and live document history without breaking anything." Every major technical decision (schema format, DB migration, renderer, validation) revolves around the same constraint: the new system must be strictly additive.

The recommended approach is a dual rendering path. Existing hardcoded templates (GENERAL, EXPENSE, LEAVE, PURCHASE, BUSINESS_TRIP, OVERTIME) continue using their purpose-built React components and Java validators. New admin-created templates use a dynamic JSON renderer built on the existing react-hook-form + zod + TailwindCSS stack. The binary discriminator is `schema_definition IS NULL` on the `approval_template` table: null means hardcoded, non-null means dynamic. This architecture avoids a full migration of existing templates while enabling new ones from day one.

The critical risks are schema design lock-in (a poorly designed JSON schema format is almost impossible to change retroactively), breaking the dual rendering path (one wrong change to templateRegistry.ts or DocumentFormValidator destroys all 6 existing templates), and calculation field security (using eval() or new Function() opens stored XSS). These three risks must be addressed at the start of the first phase — before any builder UI is built. Everything else is implementation work with well-understood patterns.

## Key Findings

### Recommended Stack

The stack addition is minimal: only 2 new dependencies are needed. The existing stack already provides everything required for the form builder. `@hello-pangea/dnd` is already installed and used in 3 components — reuse it for builder drag-and-drop. `react-hook-form`, `zod`, and TanStack Query are already used in all 6 existing form templates — the dynamic renderer follows the same patterns.

**New dependencies only:**
- `expr-eval` (frontend, ~15KB): Safe sandboxed formula evaluation for calculation fields — use `expr-eval-fork` (v3.0.3) as drop-in replacement if maintenance becomes a concern
- `com.networknt:json-schema-validator:1.5.5` (backend): Jackson-native JSON Schema validation for dynamic template form data; evaluate against pure Java field-by-field validation during Phase 2 — use whichever proves simpler for the custom schema format

**Technologies to explicitly reject:**
- `@dnd-kit/core`: Already have @hello-pangea/dnd in 3 components; mixing DnD libraries doubles bundle size and requires rewriting working code
- RJSF / JSON Forms: Both conflict with existing react-hook-form + zod; would create two parallel form systems
- `eval()` / `new Function()`: Security risk — stored XSS via admin-authored formulas
- `@dnd-kit/react` (0.3.x): Pre-1.0, not production-ready

### Expected Features

Research identified 5 phases of feature delivery from schema-critical foundations to optional migration work.

**Must have (table stakes for builder to be usable):**
- 6 core field types: text, textarea, number, date, select, table (covers all 6 existing form patterns)
- Three-panel builder UI: field palette (left), canvas with drag reorder (center), property panel (right)
- Live preview toggle between builder mode and rendered form
- Template CRUD admin page with active/inactive toggle
- Dynamic form rendering in both edit and read-only modes
- Runtime Zod schema generation from JSON field definitions
- Backend JSON schema validation (dynamic validator as fallback in DocumentFormValidator)
- Template versioning with schema snapshot on document submission

**Should have (differentiators):**
- Conditional show/hide logic (declarative rules, not code)
- Calculation fields with SUM and basic arithmetic (generalize existing ExpenseForm pattern)
- Date range compound field (start + end + auto-duration)
- Field sections/grouping for visual organization
- Template duplication

**Defer to v2+:**
- Undo/redo in builder (2-3 admins create templates; "save frequently" is sufficient)
- Migration of 6 hardcoded forms to JSON schemas (optional, high-risk, low-reward)
- User picker field (requires org tree component integration)
- Template import/export
- Checkbox/radio groups (add when a specific form needs them)

**Explicit anti-features — do not build:**
- Full formula/spreadsheet engine (security risk; predefined SUM/arithmetic covers 95% of needs)
- 2D grid drag-and-drop layout (5x harder than vertical list; use width hints instead)
- Multi-page forms (Korean approval forms are single-page by industry convention)
- User-facing builder (restrict to ADMIN/SUPER_ADMIN only)

### Architecture Approach

The architecture centers on a dual rendering path maintained through two extension points: `getTemplateEntry()` in the frontend (extends TEMPLATE_REGISTRY without replacing it) and `DocumentFormValidator.validate()` in the backend (falls through to `DynamicFormValidator` when no hardcoded strategy exists). Schema snapshots on `document_content` guarantee that submitted documents always render with the exact schema they were created with, regardless of subsequent template changes.

**Major components:**
1. `approval_template` (EXTENDED DB) — gains `schema_definition JSON NULL`, `schema_version INT`, `is_custom BOOLEAN`, `category`, `icon`, `created_by` columns via Flyway migration
2. `template_schema_version` (NEW DB TABLE) — append-only version history; every schema save creates a new entry
3. `document_content` (EXTENDED DB) — gains `schema_version INT NULL` and `schema_definition_snapshot JSON NULL` for document-pinned rendering
4. `DynamicFormValidator` (NEW backend) — validates formData against stored JSON schema; invoked by DocumentFormValidator as fallback for non-hardcoded template codes
5. `DynamicFormRenderer` (NEW frontend) — renders JSON schema into React form using react-hook-form + zod; both edit and read-only modes
6. `TemplateBuilderPage` (NEW frontend) — three-panel admin UI using @hello-pangea/dnd for field palette-to-canvas and reorder
7. `useTemplateBuilderStore` (NEW Zustand store) — builder UI state (selected field, schema draft state)
8. `useConditionalLogic` (NEW frontend hook) — reactive evaluation of show/hide/require rules via react-hook-form `watch()`
9. `formulaEngine` (NEW frontend module) — wraps expr-eval for safe calculation field evaluation

**JSON Schema format (custom, not JSON Schema Draft 7):**
- Root: `{ version: number, fields: FieldDefinition[], conditionalRules?, calculationRules? }`
- Each field: `{ id, type, label, required, config?, conditions? }` using discriminated union pattern
- `config` object holds type-specific settings; unknown field types ignore unknown config keys
- `version` at root is non-negotiable even if it seems unnecessary at first

### Critical Pitfalls

1. **Schema migration breaks existing documents** — New columns must be nullable. `schema_version = NULL` in `document_content` means "hardcoded template, use TEMPLATE_REGISTRY." Never alter existing data semantics. Test Flyway migration against a real DB dump before deploy. (Phase 1)

2. **Breaking the dual rendering path** — Never replace TEMPLATE_REGISTRY or DocumentFormValidator's hardcoded strategy dispatch. Extend them. The 6 existing FormValidationStrategy beans and hardcoded React components must remain untouched. The moment these are removed, all existing functionality breaks. (Phase 1 architectural constraint, enforced permanently)

3. **Calculation field code injection via eval()** — Use `expr-eval` exclusively. Never use `eval()`, `new Function()`, or dynamic code execution for admin-authored formulas. Backend must recalculate all formula fields on document submission to prevent client-tampered values. (Phase 4)

4. **Conditional logic circular dependencies** — Build DAG cycle detection (DFS, ~30 lines) before allowing conditional rule saves. Circular rules cause React "Maximum update depth exceeded" browser freezes. Add a max evaluation depth of 20 as runtime safety net. (Phase 4)

5. **JSON schema format that cannot evolve** — Use discriminated union pattern with type-specific `config` objects. Always include `version` at schema root. Field IDs must be stable identifiers (not labels, not positions). Finalize in Phase 1 before any rendering code is written.

## Implications for Roadmap

Based on the feature dependency graph and pitfall phase warnings, a 5-phase structure is recommended:

### Phase 1: Schema Foundation
**Rationale:** Everything else — renderer, builder UI, conditional logic, calculations — depends on the JSON schema format and DB structure. Getting the schema design wrong is the hardest mistake to undo. This phase must be completed and validated before any UI work begins.
**Delivers:** Correct DB structure, stable JSON schema format, template CRUD API, backend dynamic validation service, template versioning infrastructure
**Addresses:** JSON schema storage, template CRUD, template versioning, backend validation
**Avoids:** Pitfall 1 (schema migration), Pitfall 2 (dual path — architectural decision made here), Pitfall 9 (inflexible schema format), Pitfall 11 (template code/prefix collisions)
**Key decisions to make:** Schema format design (discriminated union, `version` at root, stable field IDs), Flyway migration strategy (additive-only, nullable columns), auto-generated template codes (`CUSTOM_{id}`)

### Phase 2: Dynamic Form Rendering
**Rationale:** The renderer must work before the builder is useful. Approvers and drafters interact with the renderer on every document. The builder is only used by 2-3 admins occasionally. Renderer correctness is higher priority than builder polish.
**Delivers:** DynamicFormRenderer (edit + read-only), runtime Zod schema generation, DynamicFormValidator backend, integration into existing DocumentEditorPage and DocumentDetailPage
**Addresses:** Dynamic form rendering both modes, runtime Zod generation, backend schema validation
**Avoids:** Pitfall 2 (extend getTemplateEntry() instead of replacing TEMPLATE_REGISTRY), Pitfall 8 (validation mismatch — shared schema drives both FE and BE), Pitfall 12 (missing read-only mode)
**Key order:** Build read-only mode first (simpler, more frequently used by all approvers), then edit mode

### Phase 3: Builder UI
**Rationale:** Can only be built after the renderer works — builder preview mode requires real-time schema rendering. Builder produces the JSON schema; renderer consumes it. Reversing this order means building preview twice.
**Delivers:** Three-panel TemplateBuilderPage, field palette, canvas with drag-and-drop reorder, property panel per field type, live preview toggle, template list admin page
**Addresses:** Builder UX (palette, canvas, property panel, preview), template management admin page
**Avoids:** Pitfall 5 (over-engineering — hard scope enforced: 6 field types, flat list, no undo/redo, no nested containers), Pitfall 7 (DnD touch/accessibility — add keyboard arrow buttons as fallback to DnD)
**Hard scope boundary:** text, textarea, number, date, select, table field types only; flat single-column list; no undo/redo; no drag between nested containers

### Phase 4: Advanced Features
**Rationale:** Conditional logic and calculations are differentiators, not table stakes. They depend on the full set of basic field types working correctly in Phase 3. Building them earlier risks designing rules that reference field types that don't exist yet.
**Delivers:** Conditional show/hide/require logic engine, calculation fields (SUM, arithmetic), DAG cycle detection for conditional rules, backend formula recalculation on submission
**Addresses:** Conditional logic, calculation fields (differentiators)
**Avoids:** Pitfall 3 (circular dependencies — DAG cycle detection on save, max depth at runtime), Pitfall 4 (eval() injection — expr-eval only, backend recalculation)

### Phase 5: Hardcoded Template Migration (Optional)
**Rationale:** The 6 hardcoded templates already work. Migration is optional and carries regression risk. Only pursue after Phase 4 is stable and production-proven. Defer indefinitely if no operational need emerges.
**Delivers:** JSON schemas matching the 6 existing hardcoded form types, dual-mode rendering verification, gradual one-at-a-time template flipping
**Addresses:** Migration tooling (optional differentiator)
**Avoids:** All existing template breakage by testing each migration in isolation before flipping. Schema snapshot on document_content ensures old documents still render via their original path.

### Phase Ordering Rationale

- Schema Foundation must come first because every other phase depends on it. Changing the JSON schema format after Phase 2 or 3 requires rewriting the renderer and the builder.
- Dynamic Rendering before Builder UI because the builder's live preview requires the renderer to work. Building them in reverse order means building preview twice.
- Advanced Features after Builder UI because conditional logic and calculations require all basic field types to exist as targets for rules and formulas.
- Migration is last and optional because it carries the highest regression risk with the lowest reward — the 6 existing templates already work correctly.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Conditional Logic):** The interaction between conditional visibility, required-state changes, and react-hook-form `watch()` + dynamic Zod schema regeneration has edge cases (e.g., conditionally required field inside a table) that need careful API design before implementation
- **Phase 4 (Calculation Fields):** expr-eval formula variable whitelisting and backend recalculation placement (DocumentService vs DynamicFormValidator) need implementation design decisions

Phases with standard patterns (skip research):
- **Phase 1 (Schema Foundation):** Flyway additive-only migrations are standard; discriminated union schema format is a well-established pattern
- **Phase 2 (Dynamic Rendering):** Custom renderer with react-hook-form switch-on-type is well-documented; existing codebase (ExpenseForm.tsx, templateRegistry.ts) provides direct reference implementations
- **Phase 3 (Builder UI):** Three-panel builder using @hello-pangea/dnd follows existing codebase patterns (ApprovalLineList, PositionTable already demonstrate this)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal new dependencies; reuses existing stack. expr-eval maintenance concern noted but documented fallback (expr-eval-fork) exists. |
| Features | HIGH | Korean groupware competitors analyzed; existing codebase provides ground truth for which field types are needed. |
| Architecture | HIGH | Dual rendering path, discriminator pattern, and schema snapshot strategy are well-justified. Conditional logic evaluation edge cases are MEDIUM. |
| Pitfalls | HIGH | Most pitfalls based on direct codebase inspection (templateRegistry.ts, DocumentFormValidator.java, V1 DDL). Real code, not hypothetical. |

**Overall confidence:** HIGH

### Gaps to Address

- **networknt version:** STACK.md recommends v1.5.5; ARCHITECTURE.md code examples use v3.0.x. Resolve which line to use in Phase 1. v1.5.x is more battle-tested with more community examples; v3.0.x is a breaking rewrite. Recommend v1.5.5 unless a specific v3 feature is needed.
- **Calculation field backend recalculation placement:** Architecture specifies backend must recalculate formula fields on submission but does not specify whether this lives in DocumentService or DynamicFormValidator. Design decision needed in Phase 4 planning.
- **Draft document schema version upgrade UX:** When a template is updated while a user has an open draft, PITFALLS.md documents the desired UX ("Continue with old version" vs "Upgrade to new version" warning banner). ARCHITECTURE.md does not cover this flow. Design needed in Phase 1.
- **Table field calculation columns:** ARCHITECTURE.md's TableColumn type supports text/number/date/select but not calculation. FEATURES.md notes that amount = quantity x unitPrice is needed inside table rows (existing ExpenseForm pattern). Clarify whether intra-table calculations are in Phase 2 scope or Phase 4 scope.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `templateRegistry.ts`, `DocumentFormValidator.java`, `FormValidationStrategy.java`, `ExpenseFormValidator.java`, `DocumentContent.java`, `Document.java`, `ApprovalTemplate.java`, `V1__create_schema.sql`
- [@hello-pangea/dnd npm](https://www.npmjs.com/package/@hello-pangea/dnd) — v18.0.1 already installed, used in 3 components
- [networknt json-schema-validator GitHub](https://github.com/networknt/json-schema-validator) — v1.5.5, Jackson-native, active maintenance
- [MDN eval() Security Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval)
- [dnd-kit Accessibility Documentation](https://docs.dndkit.com/guides/accessibility)

### Secondary (MEDIUM confidence)
- Korean groupware competitors: DaouOffice, HiWorks — field type analysis for Korean corporate approval forms
- [expr-eval GitHub](https://github.com/silentmatt/expr-eval) — v2.0.2, sandboxed evaluation
- [expr-eval-fork npm](https://www.npmjs.com/package/expr-eval-fork) — v3.0.3, maintained alternative
- [Schema Versioning Pattern (MongoDB)](https://www.mongodb.com/company/blog/building-with-patterns/the-schema-versioning-pattern)
- [dnd-kit Touch Sensor Issues (GitHub #435)](https://github.com/clauderic/dnd-kit/issues/435)
- [dnd-kit form builder discussion #639](https://github.com/clauderic/dnd-kit/discussions/639) — palette-to-canvas cross-container DnD pattern

### Tertiary (LOW confidence)
- [safe-expr-eval — patches CVE-2025-12735](https://github.com/alecasg455/safe-expr-eval) — CVE reference needs independent verification before relying on this library

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
