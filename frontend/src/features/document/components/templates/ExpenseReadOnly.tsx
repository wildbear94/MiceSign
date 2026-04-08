import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/currency';
import type { ExpenseFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function ExpenseReadOnly({ formData }: TemplateReadOnlyProps) {
  const { t } = useTranslation('document');

  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  const data: ExpenseFormData = JSON.parse(formData);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
              {t('expense.columns.name')}
            </th>
            <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-24">
              {t('expense.columns.quantity')}
            </th>
            <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
              {t('expense.columns.unitPrice')}
            </th>
            <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
              {t('expense.columns.amount')}
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
              {t('expense.total')}
            </td>
            <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
              {formatCurrency(data.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
