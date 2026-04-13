import { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import type { SchemaField } from '../SchemaFieldEditor/types';
import DynamicFieldRenderer from '../../../document/components/dynamic/DynamicFieldRenderer';
import { adaptSchemaFieldToFieldDefinition } from '../../../document/components/dynamic/adaptSchemaField';

/**
 * Phase 24.1-04: admin FormPreview 의 필드 렌더러는 사용자측
 * `DynamicFieldRenderer` 에 위임하여 admin↔user 간 렌더 로직 이중화를 제거한다.
 *
 * **이진 결정 (선택 A - 미변경):** PreviewFieldRenderer 의 기존 prop 시그니처
 * `{ field, value, onChange, dynamicRequired }` 를 유지한다. 호출부(`FormPreview.tsx`)는
 * 절대 수정하지 않는다. 내부에서 필드별 미니 `useForm` 을 만들고 `<FormProvider>` 로
 * 감싸 `DynamicFieldRenderer` 에게 위임한다 (table 필드가 `useFormContext` 에 의존하므로
 * FormProvider 는 필수).
 *
 * 주의사항:
 * - admin 의 formValues 는 외부 state 이므로, 내부 form.watch() 로 값 변경을 감지해
 *   외부 onChange 를 호출하는 단방향 동기화 + 외부 value 가 바뀌면 setValue 로 역방향 동기화.
 * - admin FormPreview 의 table 미리보기는 기존에 `[0, 1]` 고정 disabled 행을 보여줬으나
 *   DynamicTableField 로 위임되면 editable 로 바뀐다 — 의도된 UX 개선이며, 회귀는
 *   Plan 05 의 수동 체크리스트에 기록한다.
 */
interface PreviewFieldRendererProps {
  field: SchemaField;
  value?: unknown;
  onChange?: (value: unknown) => void;
  dynamicRequired?: boolean;
  disabled?: boolean; // Phase 25 D-29: 계산 결과 필드 비활성화 표시
}

export default function PreviewFieldRenderer({
  field,
  value,
  onChange,
  dynamicRequired,
  disabled,
}: PreviewFieldRendererProps) {
  const adapted = useMemo(
    () => adaptSchemaFieldToFieldDefinition(field),
    [field],
  );

  const form = useForm<Record<string, unknown>>({
    defaultValues: { [field.id]: value },
  });

  // 외부 value → 내부 form state 역방향 동기화 (FormPreview 의 "미리보기 초기화" 버튼 등)
  useEffect(() => {
    const current = form.getValues(field.id);
    if (current !== value) {
      form.setValue(field.id, value, { shouldDirty: false, shouldValidate: false });
    }
    // form 은 안정 참조이므로 deps 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, field.id]);

  // 내부 form state → 외부 onChange 단방향 동기화
  useEffect(() => {
    if (!onChange) return;
    const subscription = form.watch((values) => {
      const next = values[field.id];
      if (next !== value) {
        onChange(next);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, field.id, value, onChange]);

  if (field.type === 'hidden') {
    return null;
  }

  return (
    <FormProvider {...form}>
      <DynamicFieldRenderer
        field={adapted}
        mode="edit"
        register={form.register}
        control={form.control}
        dynamicRequired={dynamicRequired}
        disabled={disabled}
      />
    </FormProvider>
  );
}
