import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  templateImportSchema,
  flattenZodErrors,
  type TemplateImportData,
} from '../validations/templateImportSchema';

/**
 * Phase 26 Plan 02 — ImportTemplateModal (D-09, D-10, CNV-03)
 *
 * File picker → size guard (T-26-02) → .json extension guard → JSON.parse
 * → templateImportSchema.safeParse → render error list OR success chip.
 * On user confirm, hands the parsed `TemplateImportData` to the parent,
 * which opens TemplateFormModal prefilled (prefix intentionally empty).
 */
interface ImportTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onValid: (parsed: TemplateImportData) => void;
}

const MAX_FILE_SIZE = 1_000_000; // 1MB — T-26-02 DoS mitigation

interface ErrorItem {
  path: string;
  message: string;
}

export default function ImportTemplateModal({ open, onClose, onValid }: ImportTemplateModalProps) {
  const { t } = useTranslation('admin');
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ErrorItem[] | null>(null);
  const [validated, setValidated] = useState<TemplateImportData | null>(null);

  // Reset internal state when modal re-opens
  useEffect(() => {
    if (open) {
      setFile(null);
      setErrors(null);
      setValidated(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleFileSelected = async (selected: File) => {
    setFile(selected);
    setValidated(null);
    setErrors(null);

    // Extension guard
    if (!selected.name.toLowerCase().endsWith('.json')) {
      setErrors([{ path: '(root)', message: t('templates.importErrorNotJson') }]);
      return;
    }

    // Size guard (T-26-02): reject if file.size > 1_000_000 bytes
    if (selected.size > MAX_FILE_SIZE) {
      setErrors([{ path: '(root)', message: t('templates.importErrorFileTooLarge') }]);
      return;
    }

    let text: string;
    try {
      text = await selected.text();
    } catch {
      setErrors([{ path: '(root)', message: t('templates.importErrorNotJson') }]);
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      setErrors([{ path: '(root)', message: t('templates.importErrorNotJson') }]);
      return;
    }

    const result = templateImportSchema.safeParse(parsedJson);
    if (!result.success) {
      setErrors(flattenZodErrors(result.error));
      return;
    }

    setValidated(result.data);
    setErrors(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFileSelected(f);
  };

  const handleRemove = () => {
    setFile(null);
    setErrors(null);
    setValidated(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (validated) onValid(validated);
  };

  const displayedErrors = errors?.slice(0, 50) ?? [];
  const overflowCount = errors && errors.length > 50 ? errors.length - 50 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-import-title"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-[95vw] max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="tpl-import-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('templates.importTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Dropzone / file picker */}
          {!file && (
            <label className="block cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={handleFileChange}
              />
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 rounded-lg p-8 text-center transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  {t('templates.importDropzone')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('templates.importDropzoneHint')}
                </p>
              </div>
            </label>
          )}

          {/* Selected file row */}
          {file && (
            <div className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileJson className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-gray-50 truncate">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
                aria-label={t('templates.selectedFileRemove')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error container */}
          {errors && errors.length > 0 && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4"
            >
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold mb-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {t('templates.importValidationFailTitle')}
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                {t('templates.importValidationFailHelp')}
              </p>
              <ul className="max-h-48 overflow-y-auto space-y-1">
                {displayedErrors.map((e, idx) => (
                  <li key={`${e.path}-${idx}`} className="text-xs">
                    <code className="font-mono font-medium text-red-700 dark:text-red-300">
                      {e.path}
                    </code>
                    <span className="text-red-600 dark:text-red-400">: {e.message}</span>
                  </li>
                ))}
                {overflowCount > 0 && (
                  <li className="text-xs text-red-500">
                    {t('templates.importErrorOverflow', { count: overflowCount })}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Success chip */}
          {validated && (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {t('templates.importValidationOk')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={validated === null}
            className="h-10 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('templates.importSubmit')}
          </button>
        </div>
      </div>
    </div>
  );
}
