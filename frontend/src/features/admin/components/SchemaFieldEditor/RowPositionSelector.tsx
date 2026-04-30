import { useState } from 'react';
import { Plus, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export interface RowPositionSelectorProps {
  /** Current rowGroup value of the field. `null` represents undefined (single-row). */
  value: number | null;
  /** Called when the user picks a new row position. `null` = single-row (rowGroup undefined). */
  onChange: (rowGroup: number | null) => void;
  /** Map of rowGroup number → count of non-wide fields currently in that row, for cap-3 enforcement. */
  currentRowOccupancy: Record<number, number>;
  /** Field's own current rowGroup, so its own slot does not disable its current row. */
  ownCurrentRowGroup: number | null;
  /** Hard cap (always 3 in this phase, exposed for future-proofing). */
  maxFieldsPerRow?: number;
}

// Module-scope class strings — Tailwind compile-time scanner needs literal strings.
// Verbatim from UI-SPEC §B Builder Layout lines 294~296 of 36-UI-SPEC.md.
const SELECTED_CLASS =
  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ' +
  'border border-blue-600 bg-blue-600 text-white ' +
  'dark:bg-blue-500 dark:border-blue-500';

const UNSELECTED_CLASS =
  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ' +
  'border border-gray-300 dark:border-gray-600 ' +
  'bg-gray-50 dark:bg-gray-800 ' +
  'text-gray-700 dark:text-gray-200 ' +
  'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';

const DISABLED_CLASS =
  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ' +
  'border border-gray-200 dark:border-gray-700 ' +
  'bg-gray-100 dark:bg-gray-800/50 ' +
  'text-gray-400 dark:text-gray-600 cursor-not-allowed';

const FLASH_CLASS = 'animate-pulse ring-2 ring-red-500';

export default function RowPositionSelector({
  value,
  onChange,
  currentRowOccupancy,
  ownCurrentRowGroup,
  maxFieldsPerRow = 3,
}: RowPositionSelectorProps) {
  const { t } = useTranslation('admin');
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  // Build set of visible row numbers from currentRowOccupancy keys.
  // Also include `value` if it is set to a row not yet present in occupancy
  // (e.g., admin just clicked + 새 행 in a previous render and parent has not
  // yet reflected the new row in occupancy this cycle).
  const numericKeys = Object.keys(currentRowOccupancy)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n) && n > 0);
  const rowSet = new Set<number>(numericKeys);
  if (value !== null && value > 0) rowSet.add(value);
  const visibleRowNumbers = Array.from(rowSet).sort((a, b) => a - b);
  const maxRow = visibleRowNumbers.length > 0 ? visibleRowNumbers[visibleRowNumbers.length - 1] : 0;

  const triggerFlashAndToast = (idx: number) => {
    setFlashIndex(idx);
    toast(t('templates.rowLayout.rowFullToast'));
    setTimeout(() => setFlashIndex(null), 200);
  };

  const handleSingleClick = () => {
    onChange(null);
  };

  const handleRowClick = (n: number, isDisabled: boolean, idx: number) => {
    if (isDisabled) {
      triggerFlashAndToast(idx);
      return;
    }
    onChange(n);
  };

  const handleNewRowClick = () => {
    onChange(maxRow + 1);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 단독 button */}
      <button
        type="button"
        aria-pressed={value === null}
        onClick={handleSingleClick}
        className={value === null ? SELECTED_CLASS : UNSELECTED_CLASS}
      >
        <Square className="w-3 h-3" />
        {t('templates.rowLayout.singleButton')}
      </button>

      {/* 행 N buttons */}
      {visibleRowNumbers.map((n, idx) => {
        const isSelected = value === n;
        const occupancy = currentRowOccupancy[n] ?? 0;
        const isFull = occupancy >= maxFieldsPerRow;
        // Own field already counted in own row → that row does not become disabled
        // for this field even at cap.
        const isDisabled = isFull && ownCurrentRowGroup !== n;
        let className: string;
        if (isSelected) className = SELECTED_CLASS;
        else if (isDisabled) className = DISABLED_CLASS;
        else className = UNSELECTED_CLASS;
        if (flashIndex === idx) className = `${className} ${FLASH_CLASS}`;

        return (
          <button
            key={n}
            type="button"
            disabled={isDisabled && !isSelected}
            aria-disabled={isDisabled && !isSelected}
            aria-pressed={isSelected}
            title={
              isDisabled && !isSelected
                ? t('templates.rowLayout.rowFullTooltip')
                : undefined
            }
            onClick={() => handleRowClick(n, isDisabled && !isSelected, idx)}
            className={className}
          >
            {t('templates.rowLayout.rowButton', { number: n })}
          </button>
        );
      })}

      {/* + 새 행 button */}
      <button
        type="button"
        onClick={handleNewRowClick}
        className={UNSELECTED_CLASS}
      >
        <Plus className="w-3 h-3" />
        {t('templates.rowLayout.newRowButton')}
      </button>
    </div>
  );
}
