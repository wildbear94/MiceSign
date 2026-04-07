import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ApprovalCommentDialogProps {
  isOpen: boolean;
  action: 'approve' | 'reject';
  onConfirm: (comment: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ApprovalCommentDialog({
  isOpen,
  action,
  onConfirm,
  onCancel,
  isLoading = false,
}: ApprovalCommentDialogProps) {
  const [comment, setComment] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReject = action === 'reject';
  const title = isReject ? '반려 사유 입력' : '승인 의견 입력';
  const confirmLabel = isReject ? '반려' : '승인';
  const canConfirm = isReject ? comment.trim().length > 0 : true;

  // Reset comment when dialog opens
  useEffect(() => {
    if (isOpen) {
      setComment('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
      'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

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
        aria-labelledby="approval-comment-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
      >
        <h2
          id="approval-comment-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50"
        >
          {title}
        </h2>

        <div className="mt-4">
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isReject
                ? '반려 사유를 입력해주세요 (필수)'
                : '의견을 입력해주세요 (선택)'
            }
            rows={4}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isReject && comment.trim().length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              반려 시 사유를 반드시 입력해야 합니다.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
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
            onClick={() => onConfirm(comment)}
            disabled={isLoading || !canConfirm}
            className={`h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${
              isReject
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
