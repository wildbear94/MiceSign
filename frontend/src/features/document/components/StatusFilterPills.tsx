import type { DocumentStatus } from '../types/document';

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: 'DRAFT', label: '작성중' },
  { value: 'SUBMITTED', label: '결재 대기' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'WITHDRAWN', label: '회수' },
];

export interface StatusFilterPillsProps {
  value: DocumentStatus[];
  onChange: (statuses: DocumentStatus[]) => void;
  includeDraft?: boolean;
}

export function StatusFilterPills({ value, onChange, includeDraft = false }: StatusFilterPillsProps) {
  const options = includeDraft ? STATUS_OPTIONS : STATUS_OPTIONS.filter((o) => o.value !== 'DRAFT');
  const toggle = (status: DocumentStatus) => {
    if (value.includes(status)) {
      onChange(value.filter((s) => s !== status));
    } else {
      onChange([...value, status]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={active}
            className={
              'px-3 py-1 rounded-full border text-xs transition ' +
              (active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400')
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
