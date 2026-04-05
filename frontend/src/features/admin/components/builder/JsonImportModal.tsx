import { useState, useCallback } from 'react';
import { X, Upload, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { SchemaDefinition } from '../../types/builder';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (schema: SchemaDefinition) => void;
}

const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'table',
  'staticText',
  'hidden',
]);

const fieldDefinitionSchema: z.ZodType = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  config: z.record(z.unknown()).optional(),
});

const schemaDefinitionSchema = z.object({
  version: z.number().int().positive(),
  fields: z.array(fieldDefinitionSchema).min(1),
  conditionalRules: z.array(z.unknown()).default([]),
  calculationRules: z.array(z.unknown()).default([]),
});

type Step = 'upload' | 'preview';

export default function JsonImportModal({
  isOpen,
  onClose,
  onImport,
}: JsonImportModalProps) {
  const { t } = useTranslation('admin');
  const [step, setStep] = useState<Step>('upload');
  const [validatedSchema, setValidatedSchema] =
    useState<SchemaDefinition | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const reset = useCallback(() => {
    setStep('upload');
    setValidatedSchema(null);
    setValidationErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result;
        if (typeof text !== 'string') return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          setValidationErrors([
            t(
              'templates.invalidJson',
              '유효하지 않은 JSON 형식입니다',
            ),
          ]);
          setValidatedSchema(null);
          return;
        }

        const result = schemaDefinitionSchema.safeParse(parsed);
        if (!result.success) {
          setValidationErrors(
            result.error.issues.map(
              (issue) => `${issue.path.join('.')}: ${issue.message}`,
            ),
          );
          setValidatedSchema(null);
          return;
        }

        setValidationErrors([]);
        setValidatedSchema(result.data as SchemaDefinition);
        setStep('preview');
      };
      reader.readAsText(file);
    },
    [t],
  );

  const handleApply = useCallback(() => {
    if (validatedSchema) {
      onImport(validatedSchema);
      handleClose();
    }
  }, [validatedSchema, onImport, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('templates.jsonImportTitle', 'JSON 스키마 가져오기')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t(
                    'templates.jsonUploadHint',
                    '.json 파일을 선택하세요',
                  )}
                </span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                    {t(
                      'templates.validationErrors',
                      '검증 오류',
                    )}
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((err, i) => (
                      <li
                        key={i}
                        className="text-xs text-red-600 dark:text-red-400"
                      >
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && validatedSchema && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileJson className="h-4 w-4" />
                <span>
                  {t('templates.schemaVersion', '스키마 버전')}:{' '}
                  {validatedSchema.version}
                </span>
                <span className="mx-2">|</span>
                <span>
                  {t('templates.fieldCount', '필드 수')}:{' '}
                  {validatedSchema.fields.length}
                </span>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                {validatedSchema.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 px-4 py-2"
                  >
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {field.type}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="text-xs text-red-500">
                        {t('templates.fieldRequired', '필수')}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t(
                  'templates.importWarning',
                  '가져오기를 적용하면 현재 필드 구성이 대체됩니다.',
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {t('common.cancel', '취소')}
          </button>
          {step === 'preview' && (
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {t('templates.applyImport', '적용')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
