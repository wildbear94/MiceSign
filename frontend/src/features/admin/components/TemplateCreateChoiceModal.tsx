import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileText,
  LayoutTemplate,
  Upload,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

/**
 * Phase 26 Plan 02 — TemplateCreateChoiceModal (D-16, D-17)
 *
 * Entry router after the admin clicks "양식 추가". Presents 3 vertically
 * stacked choice cards: blank / preset / import. All three eventually
 * resolve to the same TemplateFormModal (with different initialValues).
 */
interface TemplateCreateChoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectPreset: () => void;
  onSelectImport: () => void;
}

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  ariaLabel: string;
}

function ChoiceCard({ icon: Icon, title, description, onClick, ariaLabel }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-600 hover:ring-2 hover:ring-blue-600/30 dark:hover:ring-blue-400/30 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 transition-all text-left flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

export default function TemplateCreateChoiceModal({
  open,
  onClose,
  onSelectBlank,
  onSelectPreset,
  onSelectImport,
}: TemplateCreateChoiceModalProps) {
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
        aria-labelledby="tpl-choice-title"
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-[95vw] max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="tpl-choice-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('templates.createChoiceTitle')}
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
        <div className="p-6 space-y-3">
          <ChoiceCard
            icon={FileText}
            title={t('templates.createBlankTitle')}
            description={t('templates.createBlankDesc')}
            onClick={onSelectBlank}
            ariaLabel={t('templates.createBlankTitle')}
          />
          <ChoiceCard
            icon={LayoutTemplate}
            title={t('templates.createPresetTitle')}
            description={t('templates.createPresetDesc')}
            onClick={onSelectPreset}
            ariaLabel={t('templates.createPresetTitle')}
          />
          <ChoiceCard
            icon={Upload}
            title={t('templates.createImportTitle')}
            description={t('templates.createImportDesc')}
            onClick={onSelectImport}
            ariaLabel={t('templates.createImportTitle')}
          />
        </div>
      </div>
    </div>
  );
}
