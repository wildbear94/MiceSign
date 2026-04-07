import { formatCurrency } from '../../utils/currency';
import type { ExpenseFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function ExpenseReadOnly({ formData }: TemplateReadOnlyProps) {
  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  let data: ExpenseFormData;
  try {
    data = JSON.parse(formData) as ExpenseFormData;
  } catch {
    return <p className="text-sm text-gray-400">데이터 파싱 오류</p>;
  }

  return (
    <div className="space-y-4">
      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="text-left text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2">
                항목명
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-24">
                수량
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                단가
              </th>
              <th className="text-right text-sm font-semibold text-gray-600 dark:text-gray-400 px-4 py-2 w-32">
                금액
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
              <td
                colSpan={3}
                className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50"
              >
                합계
              </td>
              <td className="px-4 py-2 text-right font-semibold text-base text-gray-900 dark:text-gray-50">
                {formatCurrency(data.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment info */}
      <div className="grid grid-cols-2 gap-4">
        {data.paymentMethod && (
          <div>
            <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
              결제 방법
            </span>
            <span className="text-sm text-gray-900 dark:text-gray-50">
              {data.paymentMethod}
            </span>
          </div>
        )}
        {data.accountInfo && (
          <div>
            <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
              계좌 정보
            </span>
            <span className="text-sm text-gray-900 dark:text-gray-50">
              {data.accountInfo}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
