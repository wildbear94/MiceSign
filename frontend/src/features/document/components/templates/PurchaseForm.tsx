import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import FileAttachmentArea from '../attachment/FileAttachmentArea';
import { purchaseFormSchema, type PurchaseFormValues } from '../../validations/purchaseSchema';
import type { TemplateEditProps } from './templateRegistry';
import type { PurchaseFormData } from '../../types/document';

export default function PurchaseForm({
  documentId,
  initialData,
  onSave,
  readOnly = false,
}: TemplateEditProps) {
  const { t } = useTranslation('document');

  const defaultItems = [{ name: '', quantity: 1, unitPrice: 0, amount: 0 }];

  const parsedFormData: PurchaseFormData | null = initialData?.formData
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
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      supplier: parsedFormData?.supplier ?? '',
      deliveryDate: parsedFormData?.deliveryDate ?? '',
      purchaseReason: parsedFormData?.purchaseReason ?? '',
      items: parsedFormData?.items ?? defaultItems,
      totalAmount: parsedFormData?.totalAmount ?? 0,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (initialData) {
      const fd: PurchaseFormData | null = initialData.formData
        ? JSON.parse(initialData.formData)
        : null;
      reset({
        title: initialData.title,
        supplier: fd?.supplier ?? '',
        deliveryDate: fd?.deliveryDate ?? '',
        purchaseReason: fd?.purchaseReason ?? '',
        items: fd?.items ?? defaultItems,
        totalAmount: fd?.totalAmount ?? 0,
      });
    }
  }, [initialData, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch items for auto-sum
  const watchedItems = watch('items');

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

  const onSubmit = async (values: PurchaseFormValues) => {
    const formData: PurchaseFormData = {
      supplier: values.supplier,
      deliveryDate: values.deliveryDate,
      purchaseReason: values.purchaseReason,
      items: values.items,
      totalAmount: values.totalAmount,
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
        {t('template.PURCHASE')}
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

      {/* Supplier */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('purchase.supplier')}
        </label>
        <input
          {...register('supplier')}
          type="text"
          readOnly={readOnly}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.supplier && (
          <p className="mt-1 text-sm text-red-600">{errors.supplier.message}</p>
        )}
      </div>

      {/* Delivery Date */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('purchase.deliveryDate')}
        </label>
        <input
          {...register('deliveryDate')}
          type="date"
          readOnly={readOnly}
          className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.deliveryDate && (
          <p className="mt-1 text-sm text-red-600">{errors.deliveryDate.message}</p>
        )}
      </div>

      {/* Purchase Reason */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('purchase.purchaseReason')}
        </label>
        <textarea
          {...register('purchaseReason')}
          readOnly={readOnly}
          className="w-full min-h-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-y bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
        />
        {errors.purchaseReason && (
          <p className="mt-1 text-sm text-red-600">{errors.purchaseReason.message}</p>
        )}
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                {t('purchase.columns.name')}
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-24">
                {t('purchase.columns.quantity')}
              </th>
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                {t('purchase.columns.unitPrice')}
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                {t('purchase.columns.amount')}
              </th>
              {!readOnly && <th className="w-12" />}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const amount = (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0);
              return (
                <tr key={field.id}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.name`)}
                      type="text"
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      type="number"
                      min={1}
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <input
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      type="number"
                      min={0}
                      readOnly={readOnly}
                      className="w-full h-9 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-right bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50"
                    />
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-semibold text-right text-gray-900 dark:text-gray-50">
                      {formatCurrency(amount)}
                    </div>
                  </td>
                  {!readOnly && (
                    <td className="px-2 py-2 border-b border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        aria-label={t('purchase.removeItem')}
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
              <td colSpan={3} className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                {t('purchase.total')}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                {formatCurrency(totalAmount)}
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>

        {errors.items && typeof errors.items.message === 'string' && (
          <p className="mt-1 text-sm text-red-600">{errors.items.message}</p>
        )}
      </div>

      {/* Add row button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => append({ name: '', quantity: 1, unitPrice: 0, amount: 0 })}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          {t('purchase.addItem')}
        </button>
      )}

      {/* Attachments */}
      {documentId ? (
        <FileAttachmentArea
          documentId={documentId}
          documentStatus="DRAFT"
          readOnly={readOnly}
        />
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          문서를 저장한 후 파일을 첨부할 수 있습니다.
        </p>
      )}
    </form>
  );
}
