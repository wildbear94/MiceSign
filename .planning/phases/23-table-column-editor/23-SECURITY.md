# SECURITY.md — Phase 23: table-column-editor

**Phase:** 23 — table-column-editor
**ASVS Level:** 1
**Threats Closed:** 5/5
**Audit Date:** 2026-04-12

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-23-01 | DoS | mitigate | CLOSED | `TableColumnEditor.tsx` line 210: `if (columns.length >= 20) return;` in `addColumn`. Button disabled guard at line 241: `disabled={columns.length >= 20}`. |
| T-23-02 | Tampering | accept | CLOSED | Logged in Accepted Risks below. |
| T-23-03 | Tampering | accept | CLOSED | Logged in Accepted Risks below. |
| T-23-04 | Information Disclosure | accept | CLOSED | Logged in Accepted Risks below. |
| T-23-05 | DoS | mitigate | CLOSED | `TemplateFormModal.tsx` lines 127-133: filters `f.type === 'table' && (!f.config.columns || f.config.columns.length === 0)`, calls `toast.error(t('templates.columnMinError'))` and returns early, blocking save. |

---

## Accepted Risks Log

| Threat ID | Category | Component | Rationale | Owner |
|-----------|----------|-----------|-----------|-------|
| T-23-02 | Tampering | Column data (TableColumnEditor) | Frontend-only phase. Column label, ID, and type values are client-side state only. Backend validation is responsible for sanitizing and enforcing schema constraints at persistence time. No server write path exists in this phase. |  Backend (future phase) |
| T-23-03 | Tampering | ColumnConfigPanel options | `select` column option value/label fields are free-text inputs with no frontend sanitization beyond rendering. Accepted because: (1) only ADMIN/SUPER_ADMIN roles can access template management, (2) backend must validate schema JSON before persistence. No XSS risk in this admin-only UI since React escapes output by default. | Backend (future phase) |
| T-23-04 | Information Disclosure | i18n JSON (`ko/admin.json`, `en/admin.json`) | Translation files are served as public static assets via Nginx. No secrets, credentials, user data, or internal identifiers are present in these files. All keys are UI copy strings. Accepted with no action required. | N/A |

---

## Unregistered Flags

None. SUMMARY.md `## Threat Flags` sections for Plan 01 and Plan 02 contain no unregistered threat flags beyond the registered threat register.
