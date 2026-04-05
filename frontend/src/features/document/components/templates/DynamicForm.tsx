import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TemplateEditProps } from './templateRegistry';
import type { SchemaDefinition } from '../../types/dynamicForm';
import { schemaToZod } from '../../utils/schemaToZod';
import { templateApi } from '../../api/templateApi';
import DynamicFieldRenderer from './dynamic/DynamicFieldRenderer';

interface DynamicFormProps extends TemplateEditProps {
  templateCode: string;
  schemaDefinition?: SchemaDefinition;
}

export default function DynamicForm({
  initialData,
  onSave,
  templateCode,
  schemaDefinition: schemaProp,
}: DynamicFormProps) {
  // Schema loading state
  const [schema, setSchema] = useState<SchemaDefinition | null>(schemaProp ?? null);
  const [schemaLoading, setSchemaLoading] = useState(!schemaProp);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Fetch schema from API if not provided as prop
  useEffect(() => {
    if (schemaProp) return;
    let cancelled = false;

    async function fetchSchema() {
      try {
        setSchemaLoading(true);
        setSchemaError(null);
        const res = await templateApi.getTemplateSchema(templateCode);
        if (!cancelled) {
          setSchema(res.data.data);
        }
      } catch {
        if (!cancelled) {
          setSchemaError('양식 스키마를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
        }
      } finally {
        if (!cancelled) {
          setSchemaLoading(false);
        }
      }
    }

    fetchSchema();
    return () => {
      cancelled = true;
    };
  }, [schemaProp, templateCode]);

  // Build Zod schema from field definitions (memoized)
  const zodSchema = useMemo(() => {
    if (!schema?.fields?.length) return null;
    return schemaToZod(schema.fields);
  }, [schema]);

  // Parse initial formData
  const parsedFormData = useMemo(() => {
    if (!initialData?.formData) return {};
    try {
      return JSON.parse(initialData.formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [initialData?.formData]);

  // React Hook Form
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
    defaultValues: parsedFormData,
    mode: 'onBlur',
  });

  // Auto-focus first visible field
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!schema?.fields?.length || schemaLoading) return;
    const firstVisibleField = schema.fields.find(
      (f) => f.type !== 'hidden' && f.type !== 'staticText',
    );
    if (firstVisibleField && formRef.current) {
      const el = formRef.current.querySelector<HTMLElement>(
        `#${CSS.escape(firstVisibleField.id)}`,
      );
      el?.focus();
    }
  }, [schema, schemaLoading]);

  // Submit handler
  const onFormSubmit = async (data: Record<string, unknown>) => {
    await onSave({
      title: initialData?.title ?? '',
      formData: JSON.stringify(data),
    });
  };

  // Loading skeleton
  if (schemaLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-11 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  // Error state
  if (schemaError) {
    return (
      <div className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-4">
        {schemaError}
      </div>
    );
  }

  // Empty schema
  if (!schema?.fields?.length) {
    return (
      <div className="border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg p-4">
        이 템플릿에 정의된 필드가 없습니다.
      </div>
    );
  }

  return (
    <form
      id="document-form"
      ref={formRef}
      onSubmit={handleSubmit(onFormSubmit)}
      className="space-y-4"
    >
      {schema.fields.map((field) => (
        <DynamicFieldRenderer
          key={field.id}
          fieldDef={field}
          control={control}
          register={register}
          setValue={setValue}
          errors={errors}
        />
      ))}
    </form>
  );
}
