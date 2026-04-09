import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useApprove, useReject } from '../hooks/useApprovals';
import ConfirmDialog from '../../admin/components/ConfirmDialog';

interface ApprovalActionPanelProps {
  lineId: number;
  canApprove: boolean;
  onActionComplete: () => void;
}

export default function ApprovalActionPanel({
  lineId,
  canApprove,
  onActionComplete,
}: ApprovalActionPanelProps) {
  const { t } = useTranslation('approval');
  const approveMutation = useApprove();
  const rejectMutation = useReject();

  const [comment, setComment] = useState('');
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectCommentError, setRejectCommentError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  if (!canApprove) {
    return (
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('action.notYourTurn')}
        </p>
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        lineId,
        comment: comment.trim() || undefined,
      });
      setResultMessage({ type: 'success', text: t('success.approved') });
      setComment('');
      onActionComplete();
    } catch {
      setResultMessage({ type: 'error', text: t('error.approveFailed') });
    }
  };

  const handleRejectClick = () => {
    if (!comment.trim()) {
      setRejectCommentError(t('action.rejectCommentRequired'));
      return;
    }
    setRejectCommentError(null);
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = async () => {
    try {
      await rejectMutation.mutateAsync({
        lineId,
        comment: comment.trim(),
      });
      setShowRejectConfirm(false);
      setResultMessage({ type: 'success', text: t('success.rejected') });
      setComment('');
      onActionComplete();
    } catch {
      setShowRejectConfirm(false);
      setResultMessage({ type: 'error', text: t('error.approveFailed') });
    }
  };

  return (
    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Result message */}
      {resultMessage && (
        <div
          role="alert"
          className={`mb-3 p-3 rounded-lg text-sm ${
            resultMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}
        >
          {resultMessage.text}
        </div>
      )}

      {/* Comment textarea */}
      <textarea
        value={comment}
        onChange={(e) => {
          setComment(e.target.value);
          if (rejectCommentError) setRejectCommentError(null);
        }}
        placeholder={t('action.commentPlaceholder')}
        aria-label={t('action.commentPlaceholder')}
        aria-required={rejectCommentError ? 'true' : undefined}
        className="w-full h-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Reject comment error */}
      {rejectCommentError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rejectCommentError}</p>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3 mt-3">
        <button
          type="button"
          onClick={handleRejectClick}
          disabled={isPending}
          className="h-11 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1"
        >
          {rejectMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {t('action.reject')}
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1"
        >
          {approveMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {t('action.approve')}
        </button>
      </div>

      {/* Reject confirmation dialog */}
      <ConfirmDialog
        open={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={handleRejectConfirm}
        title={t('confirm.rejectTitle')}
        message={t('confirm.rejectMessage')}
        confirmLabel={t('confirm.rejectConfirm')}
        confirmVariant="danger"
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}
