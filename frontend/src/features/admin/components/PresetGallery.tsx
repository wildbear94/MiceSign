import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Receipt,
  CalendarDays,
  Plane,
  ShoppingCart,
  Users,
  FileSignature,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react';
import { presets } from '../presets';
import type { TemplateImportData } from '../validations/templateImportSchema';

/**
 * Phase 26 Plan 02 — PresetGallery (D-12~D-15, D-17, CNV-04)
 *
 * 2x2 grid of 4 preset cards. Selecting a card hands the parsed preset
 * data up to the parent TemplateListPage which opens TemplateFormModal
 * prefilled with the preset (prefix intentionally left blank — D-10).
 */
interface PresetGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (preset: TemplateImportData) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  expense: Receipt,
  leave: CalendarDays,
  trip: Plane,
  purchase: ShoppingCart,
  meeting: Users,
  proposal: FileSignature,
};

/** Map preset `key` (filename stem) to an i18n name/desc pair. */
const I18N_MAP: Record<string, { nameKey: string; descKey: string }> = {
  expense: { nameKey: 'templates.presetExpenseName', descKey: 'templates.presetExpenseDesc' },
  leave: { nameKey: 'templates.presetLeaveName', descKey: 'templates.presetLeaveDesc' },
  trip: { nameKey: 'templates.presetTripName', descKey: 'templates.presetTripDesc' },
  purchase: { nameKey: 'templates.presetPurchaseName', descKey: 'templates.presetPurchaseDesc' },
  meeting: { nameKey: 'templates.presetMeetingName', descKey: 'templates.presetMeetingDesc' },
  proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' },
};

export default function PresetGallery({ open, onClose, onSelect }: PresetGalleryProps) {
  const { t } = useTranslation('admin');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preset-gallery-title"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-[95vw] max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
      >
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="preset-gallery-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('templates.presetGalleryTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            {presets.map((preset) => {
              const Icon = ICON_MAP[preset.key] ?? LayoutTemplate;
              const i18n = I18N_MAP[preset.key];
              const displayName = i18n ? t(i18n.nameKey) : preset.data.name;
              const displayDesc = i18n
                ? t(i18n.descKey)
                : preset.data.description ?? '';
              return (
                <button
                  type="button"
                  key={preset.key}
                  onClick={() => onSelect(preset.data)}
                  aria-label={`${displayName} ${t('common.select')}`}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-600 hover:shadow-md focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 transition-all text-left flex flex-col"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {displayDesc}
                  </div>
                  <div className="mt-3 self-end">
                    <span className="inline-block text-xs px-3 py-1.5 bg-blue-600 text-white rounded">
                      {t('common.select')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
