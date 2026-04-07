import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import {
  businessTripFormSchema,
  type BusinessTripFormValues,
} from '../../validations/businessTripSchema';
import type { TemplateFormProps } from './templateRegistry';
import type { BusinessTripFormData } from '../../types/document';

const EXPENSE_CATEGORIES = [
  { value: '교통비', label: '교통비' },
  { value: '숙박비', label: '숙박비' },
  { value: '식비', label: '식비' },
  { value: '기타', label: '기타' },
];

function parseFormData(raw: string | null): BusinessTripFormData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BusinessTripFormData;
  } catch {
    return null;
  }
}

export default function BusinessTripForm({
  formData,
  onChange,
  disabled = false,
}: TemplateFormProps) {
  const parsed = parseFormData(formData);
  const isFirstRender = useRef(true);

  const defaultItinerary = [{ date: '', destination: '', purpose: '', transport: '' }];
  const defaultExpenses = [{ category: '', amount: 0, note: '' }];

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessTripFormValues>({
    resolver: zodResolver(businessTripFormSchema),
    defaultValues: {
      destination: parsed?.destination ?? '',
      startDate: parsed?.startDate ?? '',
      endDate: parsed?.endDate ?? '',
      purpose: parsed?.purpose ?? '',
      itinerary: parsed?.itinerary?.map((item) => ({
        date: item.date ?? '',
        destination: item.location ?? '',
        purpose: item.description ?? '',
        transport: '',
      })) ?? defaultItinerary,
      expenses: parsed?.expenses?.map((item) => ({
        category: item.category ?? '',
        amount: item.amount ?? 0,
        note: item.description ?? '',
      })) ?? defaultExpenses,
      totalExpense: parsed?.totalExpense ?? 0,
      accompanies: '',
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

  const watchedDestination = watch('destination');
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');
  const watchedPurpose = watch('purpose');
  const watchedItinerary = watch('itinerary');
  const watchedExpenses = watch('expenses');
  const watchedAccompanies = watch('accompanies');

  // Auto-calculate total expense
  useEffect(() => {
    const total = (watchedExpenses ?? []).reduce(
      (sum, item) => sum + (item?.amount || 0),
      0,
    );
    setValue('totalExpense', total);
  }, [watchedExpenses, setValue]);

  const totalExpense = watch('totalExpense');

  // Notify parent on changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const data: BusinessTripFormData = {
      destination: watchedDestination,
      startDate: watchedStartDate,
      endDate: watchedEndDate,
      purpose: watchedPurpose,
      result: '',
      itinerary: (watchedItinerary ?? []).map((item) => ({
        date: item.date,
        location: item.destination,
        description: item.purpose,
      })),
      expenses: (watchedExpenses ?? []).map((item) => ({
        category: item.category,
        description: item.note ?? '',
        amount: item.amount,
      })),
      totalExpense: (watchedExpenses ?? []).reduce(
        (sum, item) => sum + (item?.amount || 0),
        0,
      ),
    };
    onChange({ formData: JSON.stringify(data) });
  }, [
    watchedDestination,
    watchedStartDate,
    watchedEndDate,
    watchedPurpose,
    watchedItinerary,
    watchedExpenses,
    watchedAccompanies,
    onChange,
  ]);

  return (
    <div className="space-y-4">
      {/* Destination */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          출장지
        </label>
        <input
          {...register('destination')}
          type="text"
          readOnly={disabled}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.destination && (
          <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
        )}
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          출장 목적
        </label>
        <textarea
          {...register('purpose')}
          readOnly={disabled}
          rows={3}
          className="w-full min-h-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-y bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.purpose && (
          <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
        )}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            시작일
          </label>
          <input
            {...register('startDate')}
            type="date"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            종료일
          </label>
          <input
            {...register('endDate')}
            type="date"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
          )}
        </div>
      </div>

      {/* Itinerary Table */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          출장 일정
        </label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-36">
                  날짜
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-40">
                  방문지
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                  목적
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                  교통편
                </th>
                {!disabled && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {itineraryFields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.date`)}
                      type="date"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.destination`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.purpose`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`itinerary.${index}.transport`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  {!disabled && (
                    <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => removeItinerary(index)}
                        disabled={itineraryFields.length <= 1}
                        aria-label="일정 삭제"
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

        {!disabled && (
          <button
            type="button"
            onClick={() =>
              appendItinerary({ date: '', destination: '', purpose: '', transport: '' })
            }
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            일정 추가
          </button>
        )}
      </div>

      {/* Expenses Table */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          경비 내역
        </label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                  비용항목
                </th>
                <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                  금액
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                  비고
                </th>
                {!disabled && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {expenseFields.map((field, index) => (
                <tr key={field.id}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <select
                      {...register(`expenses.${index}.category`)}
                      disabled={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    >
                      <option value="">선택</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`expenses.${index}.amount`, { valueAsNumber: true })}
                      type="number"
                      min={0}
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`expenses.${index}.note`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  {!disabled && (
                    <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => removeExpense(index)}
                        disabled={expenseFields.length <= 1}
                        aria-label="경비 삭제"
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
                <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                  합계
                </td>
                <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                  {formatCurrency(totalExpense ?? 0)}
                </td>
                <td />
                {!disabled && <td />}
              </tr>
            </tfoot>
          </table>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => appendExpense({ category: '', amount: 0, note: '' })}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            경비 추가
          </button>
        )}
      </div>

      {/* Accompanies */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          동행자
        </label>
        <input
          {...register('accompanies')}
          type="text"
          readOnly={disabled}
          placeholder="동행자가 있는 경우 입력"
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
      </div>
    </div>
  );
}
