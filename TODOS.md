# TODOS

## CNV-polish — Phase 26 follow-up (INFORMATIONAL, non-blocking)

Carried over from `/review` on Phase 26 (convenience-features). All findings are
non-blocking code quality items surfaced during pre-landing review. Land in a
future maintenance phase.

- [ ] **F6** TemplateFormModal.tsx: `initialValues` reset effect relies on object identity.
  Add a `prevOpenRef` guard so reset fires only on `false → true` transitions, or
  document that the flow always closes first.
- [ ] **F7** ImportTemplateModal / PresetGallery / TemplateCreateChoiceModal: focus trap
  incomplete — Tab leaks to background DOM. Adopt Radix Dialog or Headless UI (already
  recommended in CLAUDE.md) across all admin modals consistently.
- [ ] **F8** TemplateFormModal.tsx:292: hardcoded `aria-label="닫기"` should use
  `t('common.close')`. Applies to any close button introduced in earlier phases too.
- [ ] **F9** ImportTemplateModal.tsx:159-177: dropzone copy says "Click to select a file
  or drop it here" but no `onDrop` / `onDragOver` handlers exist. Either wire up
  drag-drop or remove the "drop it here" wording from ko/en locale keys.
- [ ] **F10** presets/index.ts:27: preset parse uses `templateImportSchema.parse`
  (throwing) at module load. Wrap in try/catch + log + filter so a regression in
  one preset JSON doesn't crash the entire admin template page.
- [ ] **F12** ImportTemplateModal.tsx:211-225: Zod error messages (e.g., literal 1 check)
  echo user-supplied values. Low risk (user's own file) but consider sanitizing
  display strings for consistency.
- [ ] **F13** TemplateListPage.tsx:117-118: `createFlow` and `editingTemplate` states
  can coexist. Make transitions mutually exclusive — `onEdit` should first call
  `setCreateFlow({kind:'closed'})`.
- [ ] Build chunk warning: `dist/assets/index-*.js` > 500 kB. Consider route-level
  dynamic `import()` code-splitting for admin pages.
