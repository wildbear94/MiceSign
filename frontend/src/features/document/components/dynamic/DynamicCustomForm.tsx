import { useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { templateApi } from '../../api/templateApi';
import { schemaToZod, buildDefaultValues } from '../../utils/schemaToZod';
import type { SchemaDefinition, FieldDefinition } from '../../types/dynamicForm';
import type { TemplateEditProps } from '../templates/templateRegistry';
import DynamicFieldRenderer from './DynamicFieldRenderer';

/**
 * Phase 24.1-03: CUSTOM 템플릿 편집 컴포넌트.
 *
 * - 신규 작성: templateApi.getTemplateSchema 로 schema fetch (렌더링 전용)
 * - 편집: initialData.schemaSnapshot 을 JSON.parse 하여 사용
 * - D-10: payload 에 schema 미포함 (백엔드 자동 snapshot)
 *
 * Task 1a 단계 — 기본 구조 + zodResolver 직접 사용. 조건/계산/빈 행 로직은 1b/1c.
 */

interface FormValues {
  __title: string;
  [fieldId: string]: unknown;
}

export default function DynamicCustomForm({
  initialData,
  onSave,
  readOnly,
}: TemplateEditProps) {
  const { templateCode } = useParams<{ templateCode: string }>();
  const existingSnapshotRaw = initialData?.schemaSnapshot;

  const {
    data: fetchedSchema,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['template-schema', templateCode],
    queryFn: () => templateApi.getTemplateSchema(templateCode!),
    enabled: !existingSnapshotRaw && !!templateCode,
  });

  const schema: SchemaDefinition | null = useMemo(() => {
    if (existingSnapshotRaw) {
      try {
        return JSON.parse(existingSnapshotRaw) as SchemaDefinition;
      } catch (e) {
        console.error('schemaSnapshot parse failed', e);
        return null;
      }
    }
    return fetchedSchema ?? null;
  }, [existingSnapshotRaw, fetchedSchema]);

  if (isLoading) {
    return <div className="p-4 text-gray-500">양식을 불러오는 중...</div>;
  }
  if (fetchError) {
    return <div className="p-4 text-red-600">양식을 불러오지 못했습니다.</div>;
  }
  if (!schema) {
    return <div className="p-4 text-red-600">유효하지 않은 양식입니다.</div>;
  }

  return (
    <DynamicFormInner
      schema={schema}
      initialData={initialData}
      onSave={onSave}
      readOnly={readOnly}
    />
  );
}

function DynamicFormInner({
  schema,
  initialData,
  onSave,
  readOnly,
}: {
  schema: SchemaDefinition;
  initialData?: TemplateEditProps['initialData'];
  onSave: TemplateEditProps['onSave'];
  readOnly?: boolean;
}) {
  const parsedFormData = useMemo<Record<string, unknown>>(() => {
    if (!initialData?.formData) return {};
    try {
      return JSON.parse(initialData.formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [initialData?.formData]);

  const defaultValues = useMemo<FormValues>(
    () => ({
      __title: initialData?.title ?? '',
      ...buildDefaultValues(schema),
      ...parsedFormData,
    }),
    [schema, parsedFormData, initialData?.title],
  );

  // Task 1b 에서 커스텀 resolver + hiddenFieldsRef 로 교체됨.
  const form = useForm<FormValues>({
    defaultValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schemaToZod(schema) as any),
  });

  const onSubmit = async (values: FormValues) => {
    const { __title, ...formFields } = values;
    // Task 1c 에서 빈 행 제거 로직 추가.
    // D-10: payload 에 schema 미포함 — 백엔드 자동 저장.
    await onSave({
      title: __title,
      bodyHtml: undefined,
      formData: JSON.stringify(formFields),
    });
  };

  return (
    <FormProvider {...form}>
      <form
        id="document-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목<span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            {...form.register('__title', { required: '제목을 입력하세요' })}
            disabled={readOnly}
            className="w-full border rounded px-3 py-2"
          />
          {form.formState.errors.__title && (
            <p className="mt-1 text-sm text-red-600">
              {String(form.formState.errors.__title.message)}
            </p>
          )}
        </div>

        {schema.fields.map((field: FieldDefinition) => {
          const errMsg = form.formState.errors[field.id]?.message as
            | string
            | undefined;
          return (
            <DynamicFieldRenderer
              key={field.id}
              field={field}
              mode="edit"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              register={form.register as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              control={form.control as any}
              error={errMsg}
              disabled={readOnly}
            />
          );
        })}
      </form>
    </FormProvider>
  );
}
