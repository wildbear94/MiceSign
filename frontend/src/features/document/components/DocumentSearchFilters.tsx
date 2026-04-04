import { useState } from 'react';
import { Search } from 'lucide-react';
import { TEMPLATE_REGISTRY } from './templates/templateRegistry';

interface DocumentSearchFiltersProps {
  keyword: string;
  status: string;
  templateCode: string;
  startDate: string;
  endDate: string;
  onSearch: (filters: {
    keyword: string;
    status: string;
    templateCode: string;
    startDate: string;
    endDate: string;
  }) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: '모든 상태' },
  { value: 'DRAFT', label: '임시저장' },
  { value: 'SUBMITTED', label: '결재중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'WITHDRAWN', label: '회수' },
];

const inputStyle =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function DocumentSearchFilters({
  keyword: initialKeyword,
  status: initialStatus,
  templateCode: initialTemplateCode,
  startDate: initialStartDate,
  endDate: initialEndDate,
  onSearch,
}: DocumentSearchFiltersProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState(initialStatus);
  const [templateCode, setTemplateCode] = useState(initialTemplateCode);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const triggerSearch = () => {
    onSearch({ keyword, status, templateCode, startDate, endDate });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') triggerSearch();
  };

  const handleReset = () => {
    setKeyword('');
    setStatus('');
    setTemplateCode('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="mb-6">
      {/* Search input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="검색어를 입력하세요 (제목, 문서번호, 기안자)"
          aria-label="문서 검색"
          className={`w-full h-11 pl-10 ${inputStyle}`}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-4 mt-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="상태 필터"
          className={inputStyle}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={templateCode}
          onChange={(e) => setTemplateCode(e.target.value)}
          aria-label="양식 필터"
          className={inputStyle}
        >
          <option value="">모든 양식</option>
          {Object.entries(TEMPLATE_REGISTRY).map(([code, entry]) => (
            <option key={code} value={code}>
              {entry.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label="시작일"
          className={inputStyle}
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          aria-label="종료일"
          className={inputStyle}
        />

        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-2"
        >
          초기화
        </button>

        <button
          type="button"
          onClick={triggerSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          검색
        </button>
      </div>
    </div>
  );
}
