import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/currency';
import type { PurchaseFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function PurchaseReadOnly({ formData }: TemplateReadOnlyProps) {
  const { t } = useTranslation('document');

  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  const data: PurchaseFormData = JSON.parse(formData);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('purchase.supplier')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.supplier}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('purchase.deliveryDate')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.deliveryDate}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('purchase.purchaseReason')}
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {data.purchaseReason}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                {t('purchase.columns.name')}
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-24">
                {t('purchase.columns.quantity')}
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                {t('purchase.columns.unitPrice')}
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                {t('purchase.columns.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                  {item.name}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-right text-gray-900 dark:text-gray-50">
                  {item.quantity}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-right text-gray-900 dark:text-gray-50">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-right text-gray-900 dark:text-gray-50">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td colSpan={3} className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                {t('purchase.total')}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                {formatCurrency(data.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
