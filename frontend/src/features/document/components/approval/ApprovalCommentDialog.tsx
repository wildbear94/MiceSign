import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ApprovalCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  mode: 'approve' | 'reject';
  isLoading: boolean;
}

export default function ApprovalCommentDialog({
  isOpen,
  onClose,
  onConfirm,
  mode,
  isLoading,
}: ApprovalCommentDialogProps) {
  const [comment, setComment] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReject = mode === 'reject';
  const title = isReject ? '결재 반려' : '결재 승인';
  const label = isReject ? '반려 사유 (필수)' : '의견 (선택)';
  const confirmLabel = isReject ? '반려하기' : '승인하기';
  const confirmDisabled = isLoading || (isReject && comment.trim().length === 0);

  // Reset comment when dialog opens
  useEffect(() => {
    if (isOpen) {
      setComment('');
      // Focus textarea after render
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

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
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmButtonClass = isReject
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-comment-dialog-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-[420px] w-full mx-4 p-6"
      >
        <h2
          id="approval-comment-dialog-title"
          className="text-lg font-semibold text-gray-900 dark:text-gray-50 text-center mb-4"
        >
          {title}
        </h2>

        <div className="mb-4">
          <label
            htmlFor="approval-comment"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
          <textarea
            ref={textareaRef}
            id="approval-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            className="w-full h-24 border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={isReject ? '반려 사유를 입력해주세요' : '의견을 입력해주세요 (선택사항)'}
          />
          <p className="text-xs text-gray-400 text-right mt-1">
            {comment.length}/500
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-11 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={() => onConfirm(comment)}
            disabled={confirmDisabled}
            className={`h-11 px-4 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
