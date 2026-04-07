import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface SubmitConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  approvalLineCount: number;
  isLoading?: boolean;
}

export default function SubmitConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  approvalLineCount,
  isLoading = false,
}: SubmitConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape key to close (unless loading)
  useEffect(() => {
    if (!isOpen || isLoading) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

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
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-confirm-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
      >
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
        </div>

        <h2
          id="submit-confirm-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50 text-center"
        >
          {title}
        </h2>

        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center">
          문서를 상신하시겠습니까?
          <br />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            (결재선: {approvalLineCount}명)
          </span>
        </p>

        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          상신 후에는 수정할 수 없습니다.
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            상신
          </button>
        </div>
      </div>
    </div>
  );
}
