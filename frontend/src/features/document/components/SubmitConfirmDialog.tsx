import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface SubmitConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  validationErrors: string[];
}

export default function SubmitConfirmDialog({
  open,
  onClose,
  onConfirm,
  isLoading,
  validationErrors,
}: SubmitConfirmDialogProps) {
  const { t } = useTranslation('document');
  const dialogRef = useRef<HTMLDivElement>(null);

  const hasErrors = validationErrors.length > 0;

  // Escape key to close (disabled during loading)
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isLoading]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
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

    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-dialog-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-[360px] w-full mx-4 p-6"
      >
        <h2
          id="submit-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50 text-center"
        >
          {hasErrors ? t('submit.validation.title') : t('submit.confirm.title')}
        </h2>

        {hasErrors ? (
          <div className="mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-2">
              {t('submit.validation.message')}
            </p>
            <ul className="space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            {t('submit.confirm.message')}
          </p>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {t('cancel', { ns: 'common', defaultValue: '취소' })}
          </button>

          {!hasErrors && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="h-11 px-4 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('submit.confirm.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
