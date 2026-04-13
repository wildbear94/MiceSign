import type { Control, UseFormRegister } from 'react-hook-form';
import type { FieldDefinition } from '../../types/dynamicForm';
import DynamicTableField from './DynamicTableField';

/**
 * Phase 24.1-02: 사용자측 동적 폼 필드 렌더러.
 *
 * admin `PreviewFieldRenderer`를 user `FieldDefinition` 타입 기반으로 추출한 공유 컴포넌트.
 * react-hook-form `register`/`control`을 prop으로 주입받아 edit/readOnly 양 모드를 단일 컴포넌트가 처리한다.
 *
 * 주의: user `FieldDefinition`은 `options`/`columns`를 최상위가 아닌 `config.options`/`config.columns`에 보관한다.
 *       (admin SchemaField와 동일 형태이며, `adaptSchemaField`를 통해 변환된다.)
 */
export interface DynamicFieldRendererProps {
  field: FieldDefinition;
  mode: 'edit' | 'readOnly';
  register?: UseFormRegister<Record<string, unknown>>;
  control?: Control<Record<string, unknown>>;
  error?: string;
  /** conditionalRules 평가 결과로 required 동적 오버라이드 */
  dynamicRequired?: boolean;
  /** calculationRules 결과 필드 등 비활성화 표시용 */
  disabled?: boolean;
  /** readOnly 모드에서만 사용 */
  value?: unknown;
}

export default function DynamicFieldRenderer(props: DynamicFieldRendererProps) {
  const { field, mode } = props;
  const isRequired = props.dynamicRequired ?? field.required ?? false;

  // hidden: 실제 렌더 없음 (값만 form에 유지)
  if (field.type === 'hidden') {
    return null;
  }

  // staticText: 읽기 전용 설명 (config.content 사용 — admin과 동일)
  if (field.type === 'staticText') {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 py-2 whitespace-pre-wrap">
        {field.config?.content ?? field.label}
      </div>
    );
  }

  // table: 별도 컴포넌트 위임
  if (field.type === 'table') {
    if (mode === 'edit' && props.control) {
      return (
        <DynamicTableField
          field={field}
          control={props.control}
          disabled={props.disabled}
        />
      );
    }
    // readOnly table은 Plan 03 (DynamicCustomReadOnly) 에서 처리. 여기서는 placeholder.
    return (
      <div data-testid={`dyn-table-${field.id}`} className="text-sm text-gray-500">
        [table readOnly handled by DynamicCustomReadOnly]
      </div>
    );
  }

  // readOnly 모드 공통 렌더링 (라벨 + 값 텍스트)
  if (mode === 'readOnly') {
    const displayValue = formatReadOnlyValue(field, props.value);
    return (
      <div className="py-2">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label}
        </div>
        <div className="text-base text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {displayValue || '-'}
        </div>
      </div>
    );
  }

  // edit 모드 — register 필수
  if (!props.register) {
    throw new Error(
      `DynamicFieldRenderer: register is required in edit mode (field=${field.id})`,
    );
  }

  const inputCls =
    'w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600';

  const labelBlock = (
    <label
      htmlFor={field.id}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
    >
      {field.label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const errorBlock = props.error ? (
    <p className="mt-1 text-sm text-red-600">{props.error}</p>
  ) : null;

  switch (field.type) {
    case 'text':
      return (
        <div className="mb-4">
          {labelBlock}
          <input
            id={field.id}
            type="text"
            disabled={props.disabled}
            aria-required={isRequired}
            placeholder={field.config?.placeholder ?? ''}
            className={inputCls}
            {...props.register(field.id)}
          />
          {errorBlock}
        </div>
      );
    case 'textarea':
      return (
        <div className="mb-4">
          {labelBlock}
          <textarea
            id={field.id}
            disabled={props.disabled}
            aria-required={isRequired}
            placeholder={field.config?.placeholder ?? ''}
            rows={field.config?.minRows ?? 4}
            className={inputCls}
            {...props.register(field.id)}
          />
          {errorBlock}
        </div>
      );
    case 'number':
      return (
        <div className="mb-4">
          {labelBlock}
          <div className="flex items-center gap-2">
            <input
              id={field.id}
              type="number"
              disabled={props.disabled}
              aria-required={isRequired}
              placeholder={field.config?.placeholder ?? ''}
              className={inputCls}
              {...props.register(field.id, { valueAsNumber: true })}
            />
            {field.config?.unit && (
              <span className="text-sm text-gray-500 flex-shrink-0">
                {field.config.unit}
              </span>
            )}
          </div>
          {errorBlock}
        </div>
      );
    case 'date':
      return (
        <div className="mb-4">
          {labelBlock}
          <input
            id={field.id}
            type="date"
            disabled={props.disabled}
            aria-required={isRequired}
            className={inputCls}
            {...props.register(field.id)}
          />
          {errorBlock}
        </div>
      );
    case 'select':
      return (
        <div className="mb-4">
          {labelBlock}
          <select
            id={field.id}
            disabled={props.disabled}
            aria-required={isRequired}
            className={inputCls}
            {...props.register(field.id)}
          >
            <option value="">선택하세요</option>
            {(field.config?.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label || opt.value}
              </option>
            ))}
          </select>
          {errorBlock}
        </div>
      );
    default:
      return (
        <div className="text-red-500 text-sm">
          Unsupported field type: {String(field.type)}
        </div>
      );
  }
}

function formatReadOnlyValue(field: FieldDefinition, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (field.type === 'select') {
    const opt = (field.config?.options ?? []).find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  if (field.type === 'date' && typeof value === 'string') return value;
  return String(value);
}
