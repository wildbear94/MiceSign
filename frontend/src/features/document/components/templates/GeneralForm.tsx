import { useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import TiptapEditor from '../TiptapEditor';
import { generalFormSchema, type GeneralFormValues } from '../../validations/generalSchema';
import type { TemplateFormProps } from './templateRegistry';

export default function GeneralForm({
  bodyHtml,
  onChange,
  disabled = false,
}: TemplateFormProps) {
  const {
    control,
    watch,
    formState: { errors },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: {
      bodyHtml: bodyHtml ?? '',
    },
  });

  const watchedBodyHtml = watch('bodyHtml');

  // Notify parent on changes
  const handleEditorChange = useCallback(
    (html: string) => {
      onChange({ bodyHtml: html });
    },
    [onChange],
  );

  return (
    <div className="space-y-4">
      {/* Tiptap Editor */}
      <div>
        <Controller
          name="bodyHtml"
          control={control}
          render={({ field }) => (
            <TiptapEditor
              content={field.value}
              onChange={(html) => {
                field.onChange(html);
                handleEditorChange(html);
              }}
              editable={!disabled}
            />
          )}
        />
        {errors.bodyHtml && (
          <p className="mt-1 text-sm text-red-600">{errors.bodyHtml.message}</p>
        )}
      </div>
    </div>
  );
}
