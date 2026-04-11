import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: (number | 'ellipsis')[] = [];

  if (current <= 2) {
    // Near start: show first 4 + last
    pages.push(0, 1, 2, 3, 'ellipsis', total - 1);
  } else if (current >= total - 3) {
    // Near end: show first + last 4
    pages.push(0, 'ellipsis', total - 4, total - 3, total - 2, total - 1);
  } else {
    // Middle: show first + current-1, current, current+1 + last
    pages.push(0, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total - 1);
  }

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalElements,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation('admin');

  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirst = currentPage === 0;
  const isLast = currentPage === totalPages - 1;

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {t('common.totalCount', { count: totalElements })}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirst}
          className={`h-11 w-11 flex items-center justify-center rounded text-sm ${
            isFirst
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="h-11 w-11 flex items-center justify-center text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`h-11 w-11 flex items-center justify-center rounded text-sm ${
                page === currentPage
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {page + 1}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLast}
          className={`h-11 w-11 flex items-center justify-center rounded text-sm ${
            isLast
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
