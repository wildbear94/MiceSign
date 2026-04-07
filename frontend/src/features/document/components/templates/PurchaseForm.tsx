import { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { purchaseFormSchema, type PurchaseFormValues } from '../../validations/purchaseSchema';
import type { TemplateFormProps } from './templateRegistry';
import type { PurchaseFormData } from '../../types/document';

const PAYMENT_METHODS = [
  { value: '법인카드', label: '법인카드' },
  { value: '계좌이체', label: '계좌이체' },
  { value: '현금', label: '현금' },
  { value: '기타', label: '기타' },
];

function parseFormData(formData: string | null): PurchaseFormData | null {
  if (!formData) return null;
  try {
    return JSON.parse(formData) as PurchaseFormData;
  } catch {
    return null;
  }
}

export default function PurchaseForm({
  formData,
  onChange,
  disabled = false,
}: TemplateFormProps) {
  const parsed = parseFormData(formData);
  const isFirstRender = useRef(true);

  const defaultItems = [{ name: '', specification: '', quantity: 1, unitPrice: 0, amount: 0 }];

  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplier: parsed?.supplier ?? '',
      deliveryDate: parsed?.deliveryDate ?? '',
      paymentTerms: parsed?.paymentMethod ?? '',
      items: parsed?.items?.map((item) => ({
        name: item.name ?? '',
        specification: item.spec ?? '',
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        amount: item.amount ?? 0,
      })) ?? defaultItems,
      totalAmount: parsed?.totalAmount ?? 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems = watch('items');
  const watchedSupplier = watch('supplier');
  const watchedDeliveryDate = watch('deliveryDate');
  const watchedPaymentTerms = watch('paymentTerms');

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
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const data: PurchaseFormData = {
      supplier: watchedSupplier ?? '',
      deliveryDate: watchedDeliveryDate ?? '',
      paymentMethod: watchedPaymentTerms ?? '',
      purchaseReason: '',
      items: watchedItems.map((item) => ({
        name: item.name,
        spec: item.specification ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: (item.quantity || 0) * (item.unitPrice || 0),
      })),
      totalAmount: watchedItems.reduce(
        (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
        0,
      ),
    };
    onChange({ formData: JSON.stringify(data) });
  }, [watchedItems, watchedSupplier, watchedDeliveryDate, watchedPaymentTerms, onChange]);

  return (
    <div className="space-y-4">
      {/* Supplier & Delivery Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            공급업체
          </label>
          <input
            {...register('supplier')}
            type="text"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            납품 예정일
          </label>
          <input
            {...register('deliveryDate')}
            type="date"
            readOnly={disabled}
            className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
          />
        </div>
      </div>

      {/* Payment Terms */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          결제 조건
        </label>
        <select
          {...register('paymentTerms')}
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
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                품명
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                규격
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
                      {...register(`items.${index}.name`)}
                      type="text"
                      readOnly={disabled}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.specification`)}
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
                colSpan={4}
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
            append({ name: '', specification: '', quantity: 1, unitPrice: 0, amount: 0 })
          }
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          품목 추가
        </button>
      )}
    </div>
  );
}
