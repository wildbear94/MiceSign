import { useEffect, useMemo, useRef } from 'react';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { templateApi } from '../../api/templateApi';
import { schemaToZod, buildDefaultValues } from '../../utils/schemaToZod';
import { evaluateConditions } from '../../utils/evaluateConditions';
import { executeCalculations } from '../../utils/executeCalculations';
import type { SchemaDefinition, FieldDefinition } from '../../types/dynamicForm';
import type { TemplateEditProps } from '../templates/templateRegistry';
import DynamicFieldRenderer from './DynamicFieldRenderer';
import DrafterInfoHeader from '../DrafterInfoHeader';

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
  drafterLive,
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
      drafterLive={drafterLive}
    />
  );
}

function DynamicFormInner({
  schema,
  initialData,
  onSave,
  readOnly,
  drafterLive,
}: {
  schema: SchemaDefinition;
  initialData?: TemplateEditProps['initialData'];
  onSave: TemplateEditProps['onSave'];
  readOnly?: boolean;
  drafterLive: TemplateEditProps['drafterLive'];
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

  // 숨김 필드 집합 — resolver 에서 참조하기 위해 ref 로 보관 (D-16)
  const hiddenFieldsRef = useRef<Set<string>>(new Set());

  const resolver: Resolver<FormValues> = useMemo(() => {
    return async (values, ctx, options) => {
      // 숨김 필드는 required 를 false 로 오버라이드한 schema 로 검증
      const visibleSchema: SchemaDefinition = {
        ...schema,
        fields: schema.fields.map((f) =>
          hiddenFieldsRef.current.has(f.id) ? { ...f, required: false } : f,
        ),
      };
      const zod = schemaToZod(visibleSchema);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return zodResolver(zod as any)(values, ctx, options) as ReturnType<
        Resolver<FormValues>
      >;
    };
  }, [schema]);

  const form = useForm<FormValues>({
    defaultValues,
    resolver,
  });

  const watched = form.watch();

  const { hiddenFields, requiredFields } = useMemo(
    () => evaluateConditions(schema.conditionalRules ?? [], watched),
    [schema.conditionalRules, watched],
  );

  // resolver 가 다음 검증 사이클에서 최신 hidden 집합을 사용하도록 동기화
  useEffect(() => {
    hiddenFieldsRef.current = hiddenFields;
  }, [hiddenFields]);

  // calculationRules 실시간 실행 (D-18). watched 변경 시마다 결과 필드 갱신.
  // 무한 루프 방지: 현재 값과 동일하면 setValue 미호출.
  const watchedKey = JSON.stringify(watched);
  useEffect(() => {
    const results = executeCalculations(
      schema.calculationRules ?? [],
      watched,
    );
    for (const [fid, v] of Object.entries(results)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = form.getValues(fid as any);
      if (current !== v) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.setValue(fid as any, v as any, {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedKey, schema.calculationRules]);

  // 계산 결과 필드 ID 집합 (입력 비활성화용)
  const calcResultFieldIds = useMemo(() => {
    const ids = new Set<string>();
    (schema.calculationRules ?? []).forEach((r) => {
      if (r.targetFieldId) ids.add(r.targetFieldId);
    });
    return ids;
  }, [schema.calculationRules]);

  const onSubmit = async (values: FormValues) => {
    const { __title, ...formFields } = values;

    // D-26: table 필드의 빈 행 자동 제거
    const cleanedFields: Record<string, unknown> = {};
    for (const field of schema.fields) {
      const v = formFields[field.id];
      if (field.type === 'table' && Array.isArray(v)) {
        const rows = v as Array<Record<string, unknown>>;
        cleanedFields[field.id] = rows.filter((row) =>
          Object.values(row).some(
            (cell) => cell !== '' && cell !== null && cell !== undefined,
          ),
        );
      } else {
        cleanedFields[field.id] = v;
      }
    }
    // schema.fields 에 없는 키도 보존
    for (const [k, v] of Object.entries(formFields)) {
      if (!(k in cleanedFields)) cleanedFields[k] = v;
    }

    // D-10: payload 에 schema 미포함 — 백엔드 자동 저장.
    await onSave({
      title: __title,
      bodyHtml: undefined,
      formData: JSON.stringify(cleanedFields),
    });
  };

  return (
    <FormProvider {...form}>
      <form
        id="document-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <DrafterInfoHeader mode="draft" live={drafterLive} />
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
          const isHidden = hiddenFields.has(field.id);
          // table 외 숨김 필드는 unmount (값은 form state 에 보존됨 — D-19)
          if (isHidden && field.type !== 'table') return null;
          const errMsg = form.formState.errors[field.id]?.message as
            | string
            | undefined;
          return (
            <div
              key={field.id}
              style={isHidden ? { display: 'none' } : undefined}
            >
              <DynamicFieldRenderer
                field={field}
                mode="edit"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                register={form.register as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                control={form.control as any}
                error={errMsg}
                dynamicRequired={requiredFields.has(field.id)}
                disabled={readOnly || calcResultFieldIds.has(field.id)}
              />
            </div>
          );
        })}
      </form>
    </FormProvider>
  );
}
