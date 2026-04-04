import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { businessTripFormSchema, type BusinessTripFormValues } from '../../validations/businessTripSchema';
import type { TemplateEditProps } from './templateRegistry';
import type { BusinessTripFormData } from '../../types/document';
import FileAttachmentArea from '../attachment/FileAttachmentArea';

export default function BusinessTripForm({
  documentId,
  initialData,
  onSave,
  readOnly = false,
}: TemplateEditProps) {
  const { t } = useTranslation('document');

  const defaultItinerary = [{ date: '', location: '', description: '' }];
  const defaultExpenses = [{ category: 'transport', description: '', amount: 0 }];

  const parsedFormData: BusinessTripFormData | null = initialData?.formData
    ? JSON.parse(initialData.formData)
    : null;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BusinessTripFormValues>({
    resolver: zodResolver(businessTripFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      destination: parsedFormData?.destination ?? '',
      startDate: parsedFormData?.startDate ?? '',
      endDate: parsedFormData?.endDate ?? '',
      purpose: parsedFormData?.purpose ?? '',
      result: parsedFormData?.result ?? '',
      itinerary: parsedFormData?.itinerary ?? defaultItinerary,
      expenses: parsedFormData?.expenses ?? defaultExpenses,
      totalExpense: parsedFormData?.totalExpense ?? 0,
    },
  });

  const {
    fields: itineraryFields,
    append: appendItinerary,
    remove: removeItinerary,
  } = useFieldArray({ control, name: 'itinerary' });

  const {
    fields: expenseFields,
    append: appendExpense,
    remove: removeExpense,
  } = useFieldArray({ control, name: 'expenses' });

  useEffect(() => {
    if (initialData) {
      const fd: BusinessTripFormData | null = initialData.formData
        ? JSON.parse(initialData.formData)
        : null;
      reset({
        title: initialData.title,
        destination: fd?.destination ?? '',
        startDate: fd?.startDate ?? '',
        endDate: fd?.endDate ?? '',
        purpose: fd?.purpose ?? '',
        result: fd?.result ?? '',
        itinerary: fd?.itinerary ?? defaultItinerary,
        expenses: fd?.expenses ?? defaultExpenses,
        totalExpense: fd?.totalExpense ?? 0,
      });
    }
  }, [initialData, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch expenses for auto-sum
  const watchedExpenses = watch('expenses');
  const totalExpense = watch('totalExpense');

  useEffect(() => {
    const sum = watchedExpenses.reduce((acc, item) => acc + (item.amount || 0), 0);
    setValue('totalExpense', sum);
  }, [watchedExpenses, setValue]);

  const onSubmit = async (values: BusinessTripFormValues) => {
    const formData: BusinessTripFormData = {
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      purpose: values.purpose,
      result: values.result ?? '',
      itinerary: values.itinerary,
      expenses: values.expenses,
      totalExpense: values.totalExpense,
    };
    await onSave({
      title: values.title,
      bodyHtml: undefined,
      formData: JSON.stringify(formData),
    });
  };

  return (
    <form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {t('template.BUSINESS_TRIP')}
      </div>

      {/* Title */}
      <div>
        <input
          {...register('title')}
          type="text"
          placeholder={t('validation.titleRequired')}
          readOnly={readOnly}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Trip Info Section */}
      <div className="space-y-4">
        {/* Destination */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.destination')}
          </label>
          <input
            {...register('destination')}
            type="text"
            readOnly={readOnly}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.destination && (
            <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
          )}
        </div>

        {/* Start Date / End Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('businessTrip.startDate')}
            </label>
            <input
              {...register('startDate')}
              type="date"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t('businessTrip.endDate')}
            </label>
            <input
              {...register('endDate')}
              type="date"
              readOnly={readOnly}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.purpose')}
          </label>
          <textarea
            {...register('purpose')}
            readOnly={readOnly}
            className="w-full min-h-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-y bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.purpose && (
            <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
          )}
        </div>
      </div>

      {/* Itinerary Section */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('businessTrip.itinerary')}
        </label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-36">
                  {t('businessTrip.itineraryColumns.date')}
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-40">
                  {t('businessTrip.itineraryColumns.location')}
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                  {t('businessTrip.itineraryColumns.description')}
                </th>
                {!readOnly && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {itineraryFields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.date`)}
                      type="date"
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.location`)}
                      type="text"
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.description`)}
                      type="text"
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => removeItinerary(index)}
                        disabled={itineraryFields.length <= 1}
                        aria-label="행 삭제"
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {errors.itinerary && typeof errors.itinerary.message === 'string' && (
          <p className="mt-1 text-sm text-red-600">{errors.itinerary.message}</p>
        )}

        {!readOnly && (
          <button
            type="button"
            onClick={() => appendItinerary({ date: '', location: '', description: '' })}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('businessTrip.addItinerary')}
          </button>
        )}
      </div>

      {/* Expenses Section */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('businessTrip.expenses')}
        </label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                  {t('businessTrip.expenseColumns.category')}
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                  {t('businessTrip.expenseColumns.description')}
                </th>
                <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                  {t('businessTrip.expenseColumns.amount')}
                </th>
                {!readOnly && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {expenseFields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <select
                      {...register(`expenses.${index}.category`)}
                      disabled={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    >
                      <option value="transport">{t('businessTrip.expenseCategories.transport')}</option>
                      <option value="lodging">{t('businessTrip.expenseCategories.lodging')}</option>
                      <option value="meals">{t('businessTrip.expenseCategories.meals')}</option>
                      <option value="other">{t('businessTrip.expenseCategories.other')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`expenses.${index}.description`)}
                      type="text"
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`expenses.${index}.amount`, { valueAsNumber: true })}
                      type="number"
                      min={0}
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => removeExpense(index)}
                        disabled={expenseFields.length <= 1}
                        aria-label="행 삭제"
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td colSpan={2} className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                  {t('businessTrip.totalExpense')}
                </td>
                <td className="px-4 py-2 text-right text-base font-semibold text-blue-600">
                  {formatCurrency(totalExpense)}
                </td>
                {!readOnly && <td />}
              </tr>
            </tfoot>
          </table>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => appendExpense({ category: 'transport', description: '', amount: 0 })}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {t('businessTrip.addExpense')}
          </button>
        )}
      </div>

      {/* Result Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('businessTrip.result')}
        </label>
        <textarea
          {...register('result')}
          readOnly={readOnly}
          className="w-full min-h-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-y bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.result && (
          <p className="mt-1 text-sm text-red-600">{errors.result.message}</p>
        )}
      </div>

      {/* File Attachments */}
      {documentId != null && (
        <FileAttachmentArea
          documentId={documentId}
          documentStatus="DRAFT"
          readOnly={readOnly ?? false}
        />
      )}
    </form>
  );
}
