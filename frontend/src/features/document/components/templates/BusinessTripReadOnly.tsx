import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/currency';
import type { BusinessTripFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function BusinessTripReadOnly({ formData }: TemplateReadOnlyProps) {
  const { t } = useTranslation('document');

  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  const data: BusinessTripFormData = JSON.parse(formData);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.destination')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.destination}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {t('businessTrip.purpose')}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-50">{data.purpose}</p>
        </div>
      </div>

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

      {/* Itinerary */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('businessTrip.itinerary')}
        </label>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-36">
                  {t('businessTrip.columns.date')}
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                  {t('businessTrip.columns.location')}
                </th>
                <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                  {t('businessTrip.columns.description')}
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
                    {item.description ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      {data.expenses && data.expenses.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('businessTrip.expenses')}
          </label>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                    {t('businessTrip.columns.category')}
                  </th>
                  <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                    {t('businessTrip.columns.amount')}
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                    {t('businessTrip.columns.description')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                      {item.category}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-right text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                      {item.description ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                    {t('businessTrip.totalExpense')}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                    {formatCurrency(data.totalExpense ?? 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
