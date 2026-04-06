import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TemplateEditProps } from './templateRegistry';
import type { SchemaDefinition, FieldDefinition } from '../../types/dynamicForm';
import type { FieldVisibility } from '../../utils/evaluateConditions';
import { schemaToZod } from '../../utils/schemaToZod';
import { evaluateConditions } from '../../utils/evaluateConditions';
import { executeCalculation } from '../../utils/executeCalculations';
import { templateApi } from '../../api/templateApi';
import DynamicFieldRenderer from './dynamic/DynamicFieldRenderer';
import DynamicSectionField from './dynamic/DynamicSectionField';

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

  // Extract source field IDs for useWatch subscription
  const sourceFieldIds = useMemo(() => {
    if (!schema?.conditionalRules?.length && !schema?.calculationRules?.length) return [];
    const ids = new Set<string>();
    for (const rule of schema.conditionalRules ?? []) {
      for (const cond of rule.conditions) {
        ids.add(cond.sourceFieldId);
      }
    }
    for (const rule of schema.calculationRules ?? []) {
      for (const src of rule.sourceFields) {
        if (src.includes('.')) {
          ids.add(src.split('.')[0]); // Watch the table field for column changes
        } else {
          ids.add(src);
        }
      }
    }
    return Array.from(ids);
  }, [schema?.conditionalRules, schema?.calculationRules]);

  // Parse initial formData
  const parsedFormData = useMemo(() => {
    if (!initialData?.formData) return {};
    try {
      return JSON.parse(initialData.formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [initialData?.formData]);

  // React Hook Form — resolver set later after effectiveVisibility is computed
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    defaultValues: parsedFormData,
    mode: 'onBlur',
  });

  // Subscribe to source field values via useWatch
  const watchedValues = useWatch({
    control,
    name: sourceFieldIds.length > 0 ? sourceFieldIds : ['__noop__'],
    disabled: sourceFieldIds.length === 0,
  });

  // Build formValues map from watchedValues + sourceFieldIds
  const formValuesForEval = useMemo(() => {
    if (sourceFieldIds.length === 0) return {};
    const vals: Record<string, unknown> = {};
    sourceFieldIds.forEach((id, i) => {
      vals[id] = watchedValues?.[i];
    });
    return vals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFieldIds, JSON.stringify(watchedValues)]);

  // Evaluate conditions
  const fieldVisibility = useMemo(() => {
    if (!schema?.conditionalRules?.length) return new Map<string, FieldVisibility>();
    return evaluateConditions(
      schema.conditionalRules,
      formValuesForEval,
      schema.fields.map(f => ({ id: f.id, required: f.required })),
    );
  }, [schema?.conditionalRules, formValuesForEval, schema?.fields]);

  // Handle section visibility — when section hidden, all child fields also hidden
  const effectiveVisibility = useMemo(() => {
    const result = new Map(fieldVisibility);
    if (!schema?.fields) return result;
    let currentSectionHidden = false;
    for (const field of schema.fields) {
      if (field.type === 'section') {
        const vis = result.get(field.id);
        currentSectionHidden = vis ? !vis.visible : false;
      } else if (currentSectionHidden) {
        result.set(field.id, { visible: false, conditionallyRequired: false });
      }
    }
    return result;
  }, [fieldVisibility, schema?.fields]);

  // Update Zod schema with visibility
  const zodSchema = useMemo(() => {
    if (!schema?.fields?.length) return null;
    return schemaToZod(schema.fields, effectiveVisibility);
  }, [schema?.fields, effectiveVisibility]);

  // Hidden field value cleanup (D-04)
  const prevVisibilityRef = useRef<Map<string, FieldVisibility>>(new Map());
  useEffect(() => {
    const prev = prevVisibilityRef.current;
    for (const [fieldId, vis] of effectiveVisibility) {
      const prevVis = prev.get(fieldId);
      if (prevVis?.visible && !vis.visible) {
        // Field just became hidden — clear its value
        setValue(fieldId, undefined);
      }
    }
    prevVisibilityRef.current = new Map(effectiveVisibility);
  }, [effectiveVisibility, setValue]);

  // Execute calculations — set calculated values on target fields
  useEffect(() => {
    if (!schema?.calculationRules?.length) return;
    for (const rule of schema.calculationRules) {
      const targetVis = effectiveVisibility.get(rule.targetFieldId);
      if (targetVis && !targetVis.visible) continue; // Skip hidden calc fields
      const result = executeCalculation(rule, formValuesForEval);
      setValue(rule.targetFieldId, result);
    }
  }, [schema?.calculationRules, formValuesForEval, effectiveVisibility, setValue]);

  // Auto-focus first visible field
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!schema?.fields?.length || schemaLoading) return;
    const firstVisibleField = schema.fields.find(
      (f) => f.type !== 'hidden' && f.type !== 'staticText' && f.type !== 'section',
    );
    if (firstVisibleField && formRef.current) {
      const el = formRef.current.querySelector<HTMLElement>(
        `#${CSS.escape(firstVisibleField.id)}`,
      );
      el?.focus();
    }
  }, [schema, schemaLoading]);

  // Submit handler — filter out hidden fields (D-04)
  const onFormSubmit = async (data: Record<string, unknown>) => {
    const cleanData: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data)) {
      const vis = effectiveVisibility.get(key);
      if (!vis || vis.visible) {
        cleanData[key] = val;
      }
    }
    await onSave({
      title: initialData?.title ?? '',
      formData: JSON.stringify(cleanData),
    });
  };

  // Group fields into sections for rendering
  const renderFields = () => {
    if (!schema?.fields) return null;
    const elements: React.ReactNode[] = [];
    let currentSectionField: FieldDefinition | null = null;
    let sectionChildren: React.ReactNode[] = [];

    const flushSection = () => {
      if (currentSectionField) {
        const vis = effectiveVisibility.get(currentSectionField.id);
        if (!vis || vis.visible) {
          elements.push(
            <DynamicSectionField key={currentSectionField.id} fieldDef={currentSectionField}>
              {sectionChildren}
            </DynamicSectionField>
          );
        }
        sectionChildren = [];
        currentSectionField = null;
      }
    };

    for (const field of schema.fields) {
      const vis = effectiveVisibility.get(field.id);
      if (vis && !vis.visible) continue;

      if (field.type === 'section') {
        flushSection();
        currentSectionField = field;
        continue;
      }

      const isCondRequired = vis?.conditionallyRequired ?? false;
      const fieldEl = (
        <div key={field.id} className={field.config?.width === 'half' ? 'w-[calc(50%-0.5rem)]' : 'w-full'}>
          <DynamicFieldRenderer
            fieldDef={field}
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            isConditionallyRequired={isCondRequired}
            isCalculated={!!(field.config?.calculationType)}
          />
        </div>
      );

      if (currentSectionField) {
        sectionChildren.push(fieldEl);
      } else {
        elements.push(fieldEl);
      }
    }
    flushSection(); // Flush last section
    return elements;
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
      className="flex flex-wrap gap-4"
    >
      {renderFields()}
    </form>
  );
}
