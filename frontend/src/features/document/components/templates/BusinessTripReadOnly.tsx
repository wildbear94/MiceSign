import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/currency';
import type { BusinessTripFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  transport: '교통비',
  lodging: '숙박비',
  meals: '식비',
  other: '기타',
};

export default function BusinessTripReadOnly({ formData }: TemplateReadOnlyProps) {
  const { t } = useTranslation('document');

  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  const data: BusinessTripFormData = JSON.parse(formData);

  return (
    <div className="space-y-4">
      {/* Destination */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('businessTrip.destination')}
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-50">{data.destination}</p>
      </div>

      {/* Trip Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.startDate')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.startDate}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.endDate')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.endDate}</p>
        </div>
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {t('businessTrip.purpose')}
        </label>
        <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {data.purpose}
        </p>
      </div>

      {/* Itinerary Table */}
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
              </tr>
            </thead>
            <tbody>
              {data.itinerary.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                    {item.date}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                    {item.location}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Table */}
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
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                    {EXPENSE_CATEGORY_LABELS[item.category] ?? item.category}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                    {item.description}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-right text-gray-900 dark:text-gray-50">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td colSpan={2} className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                  {t('businessTrip.totalExpense')}
                </td>
                <td className="px-4 py-2 text-right text-base font-semibold text-blue-600">
                  {formatCurrency(data.totalExpense)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Result */}
      {data.result && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.result')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
            {data.result}
          </p>
        </div>
      )}
    </div>
  );
}
