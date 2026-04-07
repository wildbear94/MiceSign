import { useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { expenseFormSchema, type ExpenseFormValues } from '../../validations/expenseSchema';
import type { TemplateFormProps } from './templateRegistry';
import type { ExpenseFormData } from '../../types/document';

const PAYMENT_METHODS = [
  { value: '법인카드', label: '법인카드' },
  { value: '현금', label: '현금' },
  { value: '계좌이체', label: '계좌이체' },
];

function parseFormData(formData: string | null): ExpenseFormData | null {
  if (!formData) return null;
  try {
    return JSON.parse(formData) as ExpenseFormData;
  } catch {
    return null;
  }
}

export default function ExpenseForm({
  formData,
  onChange,
  disabled = false,
}: TemplateFormProps) {
  const parsed = parseFormData(formData);
  const isFirstRender = useRef(true);

  const defaultItems = [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }];

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      items: parsed?.items?.map((item) => ({
        description: item.name ?? (item as any).description ?? '',
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        amount: item.amount ?? 0,
      })) ?? defaultItems,
      totalAmount: parsed?.totalAmount ?? 0,
      paymentMethod: parsed?.paymentMethod ?? '',
      accountInfo: parsed?.accountInfo ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const watchedPaymentMethod = watch('paymentMethod');
  const watchedAccountInfo = watch('accountInfo');

  // Auto-calculate amounts
  useEffect(() => {
    let total = 0;
    watchedItems.forEach((item, index) => {
      const amount = (item.quantity || 0) * (item.unitPrice || 0);
      setValue(`items.${index}.amount`, amount);
      total += amount;
    });
    setValue('totalAmount', total);
  }, [watchedItems, setValue]);

  const totalAmount = watch('totalAmount');

  // Notify parent on changes
  const emitChange = useCallback(() => {
    const data: ExpenseFormData = {
      items: watchedItems.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: (item.quantity || 0) * (item.unitPrice || 0),
      })),
      totalAmount: watchedItems.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
        0,
      ),
      paymentMethod: watchedPaymentMethod,
      accountInfo: watchedAccountInfo,
    };
    onChange({ formData: JSON.stringify(data) });
  }, [watchedItems, watchedPaymentMethod, watchedAccountInfo, onChange]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    emitChange();
  }, [emitChange]);

  return (
    <div className="space-y-4">
      {/* Expense Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                항목명
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-24">
                수량
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                단가
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                금액
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                비고
              </th>
              {!disabled && <th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const amount =
                (watchedItems[index]?.quantity || 0) *
                (watchedItems[index]?.unitPrice || 0);
              return (
                <tr key={field.id}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.description`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      min={1}
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      type="number"
                      min={0}
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-semibold text-right text-gray-900 dark:text-gray-50">
                      {formatCurrency(amount)}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.note`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  {!disabled && (
                    <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        aria-label="항목 삭제"
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td
                colSpan={3}
                className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50"
              >
                합계
              </td>
              <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                {formatCurrency(totalAmount)}
              </td>
              <td />
              {!disabled && <td />}
            </tr>
          </tfoot>
        </table>

        {errors.items && typeof errors.items.message === 'string' && (
          <p className="mt-1 text-sm text-red-600">{errors.items.message}</p>
        )}
      </div>

      {/* Add row */}
      {!disabled && (
        <button
          type="button"
          onClick={() =>
            append({ description: '', quantity: 1, unitPrice: 0, amount: 0 })
          }
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          항목 추가
        </button>
      )}

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          결제 방법
        </label>
        <select
          {...register('paymentMethod')}
          disabled={disabled}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        >
          <option value="">결제 방법을 선택해주세요</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {errors.paymentMethod && (
          <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
        )}
      </div>

      {/* Account Info */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          계좌 정보
        </label>
        <input
          {...register('accountInfo')}
          type="text"
          readOnly={disabled}
          placeholder="입금 계좌 정보를 입력해주세요"
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
      </div>
    </div>
  );
}
