import { useEffect, useMemo, useCallback, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SchemaDefinition, FieldDefinition } from '../../types/dynamicForm';
import { evaluateAllConditions, type FieldVisibility } from '../../utils/evaluateConditions';
import { executeCalculation } from '../../utils/executeCalculations';
import { detectCircularDeps } from '../../utils/detectCircularDeps';
import { schemaToZod } from '../../utils/schemaToZod';
import { templateApi } from '../../api/templateApi';
import DynamicFieldRenderer from './dynamic/DynamicFieldRenderer';
import DynamicSectionField from './dynamic/DynamicSectionField';

interface DynamicFormProps {
  /** JSON string of schema definition */
  schemaDefinition: string;
  /** JSON string of form data */
  formData: string | null;
  /** Callback fired on form data changes */
  onChange: (formData: string) => void;
  /** When true, all inputs become read-only */
  disabled?: boolean;
}

export default function DynamicForm({
  schemaDefinition,
  formData,
  onChange,
  disabled = false,
}: DynamicFormProps) {
  const schema = useMemo<SchemaDefinition | null>(() => {
    try {
      return JSON.parse(schemaDefinition) as SchemaDefinition;
    } catch {
      return null;
    }
  }, [schemaDefinition]);

  // Check for circular dependencies once
  useEffect(() => {
    if (!schema) return;
    const cycle = detectCircularDeps(
      schema.conditionalRules ?? [],
      schema.calculationRules ?? [],
    );
    if (cycle) {
      console.warn('Circular dependency detected in schema rules:', cycle);
    }
  }, [schema]);

  const fields = schema?.fields ?? [];
  const fieldMeta = useMemo(
    () => fields.map((f) => ({ id: f.id, required: f.required ?? false })),
    [fields],
  );

  // Parse initial formData
  const defaultValues = useMemo(() => {
    if (!formData) return {};
    try {
      return JSON.parse(formData) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [formData]);

  // Initial visibility (no form values yet)
  const initialVisibility = useMemo(() => {
    if (!schema) return new Map<string, FieldVisibility>();
    return evaluateAllConditions(
      schema.conditionalRules ?? [],
      defaultValues,
      fieldMeta,
    );
  }, [schema, defaultValues, fieldMeta]);

  // Build Zod schema
  const zodSchema = useMemo(
    () => schemaToZod(fields, initialVisibility),
    [fields, initialVisibility],
  );

  const {
    register,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(zodSchema),
    defaultValues,
  });

  // Watch all form values for condition evaluation
  const watchedValues = useWatch({ control });

  // Compute field visibility
  const fieldVisibility = useMemo(() => {
    if (!schema) return new Map<string, FieldVisibility>();
    return evaluateAllConditions(
      schema.conditionalRules ?? [],
      watchedValues as Record<string, unknown>,
      fieldMeta,
    );
  }, [schema, watchedValues, fieldMeta]);

  // Cascade section visibility to children
  const effectiveVisibility = useMemo(() => {
    const result = new Map<string, FieldVisibility>(fieldVisibility);
    let currentSectionVisible = true;

    for (const field of fields) {
      if (field.type === 'section') {
        const sectionVis = result.get(field.id);
        currentSectionVisible = sectionVis?.visible ?? true;
      } else if (!currentSectionVisible) {
        result.set(field.id, { visible: false, conditionallyRequired: false });
      }
    }

    return result;
  }, [fieldVisibility, fields]);

  // Execute calculations
  useEffect(() => {
    if (!schema?.calculationRules) return;
    for (const rule of schema.calculationRules) {
      const targetVis = effectiveVisibility.get(rule.targetFieldId);
      if (targetVis && !targetVis.visible) continue;

      const result = executeCalculation(
        rule,
        watchedValues as Record<string, unknown>,
      );
      const currentVal = getValues(rule.targetFieldId);
      if (currentVal !== result) {
        setValue(rule.targetFieldId, result, { shouldValidate: false });
      }
    }
  }, [schema, watchedValues, effectiveVisibility, setValue, getValues]);

  // Clean up hidden field values
  const prevVisibilityRef = useMemo(() => new Map<string, boolean>(), []);
  useEffect(() => {
    for (const [fieldId, vis] of effectiveVisibility.entries()) {
      const wasVisible = prevVisibilityRef.get(fieldId) ?? true;
      if (wasVisible && !vis.visible) {
        setValue(fieldId, undefined);
      }
      prevVisibilityRef.set(fieldId, vis.visible);
    }
  }, [effectiveVisibility, setValue, prevVisibilityRef]);

  // Notify parent on changes
  useEffect(() => {
    const filtered: Record<string, unknown> = {};
    const values = watchedValues as Record<string, unknown>;
    for (const [key, val] of Object.entries(values)) {
      const vis = effectiveVisibility.get(key);
      if (!vis || vis.visible) {
        filtered[key] = val;
      }
    }
    onChange(JSON.stringify(filtered));
  }, [watchedValues, effectiveVisibility, onChange]);

  // Group fields into sections
  const groupedFields = useMemo(() => {
    const groups: {
      section: FieldDefinition | null;
      fields: FieldDefinition[];
    }[] = [];
    let currentGroup: { section: FieldDefinition | null; fields: FieldDefinition[] } = {
      section: null,
      fields: [],
    };

    for (const field of fields) {
      if (field.type === 'section') {
        if (currentGroup.fields.length > 0 || currentGroup.section) {
          groups.push(currentGroup);
        }
        currentGroup = { section: field, fields: [] };
      } else {
        currentGroup.fields.push(field);
      }
    }
    groups.push(currentGroup);

    return groups;
  }, [fields]);

  if (!schema) {
    return (
      <div className="text-sm text-red-500">
        스키마를 파싱할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedFields.map((group, gi) => {
        const sectionVis = group.section
          ? effectiveVisibility.get(group.section.id)
          : null;
        if (sectionVis && !sectionVis.visible) return null;

        const content = (
          <div className="flex flex-wrap gap-4" key={gi}>
            {group.fields.map((field) => (
              <DynamicFieldRenderer
                key={field.id}
                fieldDef={field}
                register={register}
                control={control}
                errors={errors}
                visibility={effectiveVisibility}
                isReadOnly={disabled}
              />
            ))}
          </div>
        );

        if (group.section) {
          return (
            <DynamicSectionField
              key={group.section.id}
              fieldDef={group.section}
              isReadOnly={disabled}
            >
              {content}
            </DynamicSectionField>
          );
        }

        return content;
      })}
    </div>
  );
}
