import { formatCurrency } from '../../utils/currency';
import type { PurchaseFormData } from '../../types/document';
import type { TemplateReadOnlyProps } from './templateRegistry';

export default function PurchaseReadOnly({ formData }: TemplateReadOnlyProps) {
  if (!formData) {
    return <p className="text-sm text-gray-400">내용 없음</p>;
  }

  let data: PurchaseFormData;
  try {
    data = JSON.parse(formData) as PurchaseFormData;
  } catch {
    return <p className="text-sm text-gray-400">데이터 파싱 오류</p>;
  }

  return (
    <div className="space-y-4">
      {/* Meta fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            공급업체
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.supplier || '-'}
          </span>
        </div>
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            납품 예정일
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.deliveryDate || '-'}
          </span>
        </div>
      </div>

      {data.paymentMethod && (
        <div>
          <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">
            결제 조건
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-50">
            {data.paymentMethod}
          </span>
        </div>
      )}

      {/* Items table */}
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
                <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-50">
                  {item.spec}
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
                colSpan={4}
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
    </div>
  );
}
