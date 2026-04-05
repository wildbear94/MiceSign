import { useEffect, useRef } from 'react';
import { FileText, Receipt, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTemplates } from '../hooks/useTemplates';
import type { TemplateResponse } from '../types/document';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateCode: string) => void;
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  GENERAL: <FileText className="h-8 w-8 text-gray-400 mx-auto" />,
  EXPENSE: <Receipt className="h-8 w-8 text-gray-400 mx-auto" />,
  LEAVE: <CalendarDays className="h-8 w-8 text-gray-400 mx-auto" />,
};

export default function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelect,
}: TemplateSelectionModalProps) {
  const { t } = useTranslation('document');
  const { data: templates } = useTemplates();
  const modalRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  function handleCardClick(template: TemplateResponse) {
    onSelect(template.code);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-lg w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="template-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50"
        >
          {t('templateModal.title')}
        </h2>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          {t('templateModal.subtitle')}
        </p>

        <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {templates?.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleCardClick(template)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors text-center"
            >
              {TEMPLATE_ICONS[template.code] ?? (
                <FileText className="h-8 w-8 text-gray-400 mx-auto" />
              )}
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-50 mt-3">
                {template.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
