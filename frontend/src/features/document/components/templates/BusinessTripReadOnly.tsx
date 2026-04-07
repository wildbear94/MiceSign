import { formatCurrency } from '../../utils/currency';
import type { BusinessTripFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function BusinessTripReadOnly({ formData }: TemplateReadOnlyProps) {
  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  let data: BusinessTripFormData;
  try {
    data = JSON.parse(formData) as BusinessTripFormData;
  } catch {
    return <p className="text-sm text-gray-400">데이터 파싱 오류</p>;
  }

  return (
    <div className="space-y-4">
      {/* Meta fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            출장지
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.destination}
          </span>
        </div>
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            기간
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.startDate} ~ {data.endDate}
          </span>
        </div>
      </div>

      <div>
        <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
          출장 목적
        </span>
        <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
          {data.purpose}
        </p>
      </div>

      {/* Itinerary table */}
      {data.itinerary.length > 0 && (
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            출장 일정
          </span>
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
      )}

      {/* Expenses table */}
      {data.expenses.length > 0 && (
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
            경비 내역
          </span>
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
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                      {item.category}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-right text-gray-900 dark:text-gray-50">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                    합계
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                    {formatCurrency(data.totalExpense)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {data.result && (
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            출장 결과
          </span>
          <p className="text-sm text-gray-900 dark:text-gray-50 whitespace-pre-wrap">
            {data.result}
          </p>
        </div>
      )}
    </div>
  );
}
