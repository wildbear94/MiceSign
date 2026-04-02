import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApprove, useReject } from '../../../approval/hooks/useApprovals';
import { useWithdraw, useRewrite } from '../../hooks/useDocuments';
import type { DocumentDetailResponse } from '../../types/document';
import ApprovalCommentDialog from './ApprovalCommentDialog';
import ConfirmDialog from '../../../admin/components/ConfirmDialog';

interface ApprovalActionBarProps {
  document: DocumentDetailResponse;
  currentUserId: number;
}

export default function ApprovalActionBar({
  document: doc,
  currentUserId,
}: ApprovalActionBarProps) {
  const navigate = useNavigate();

  const approveMutation = useApprove();
  const rejectMutation = useReject();
  const withdrawMutation = useWithdraw();
  const rewriteMutation = useRewrite();

  const [dialogMode, setDialogMode] = useState<'approve' | 'reject' | null>(null);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showResubmitConfirm, setShowResubmitConfirm] = useState(false);

  // Determine visibility conditions
  const isDrafter = doc.drafter.id === currentUserId;

  // Find current user's pending approval line at the current step
  const currentUserLine = doc.approvalLines?.find(
    (line) =>
      line.approver.id === currentUserId &&
      line.status === 'PENDING' &&
      line.stepOrder === doc.currentStep,
  );

  const isCurrentApprover = doc.status === 'SUBMITTED' && !!currentUserLine;

  // Can withdraw: drafter + SUBMITTED + all lines at current step are PENDING
  const canWithdraw =
    isDrafter &&
    doc.status === 'SUBMITTED' &&
    doc.approvalLines
      ?.filter((line) => line.stepOrder === doc.currentStep)
      .every((line) => line.status === 'PENDING');

  // Can resubmit: drafter + REJECTED or WITHDRAWN
  const canResubmit =
    isDrafter && (doc.status === 'REJECTED' || doc.status === 'WITHDRAWN');

  // No actions available
  if (!isCurrentApprover && !canWithdraw && !canResubmit) {
    return null;
  }

  function handleApproveConfirm(comment: string) {
    if (!currentUserLine) return;
    approveMutation.mutate(
      { lineId: currentUserLine.id, comment: comment || undefined },
      {
        onSuccess: () => {
          setDialogMode(null);
          navigate('/approvals/pending');
        },
      },
    );
  }

  function handleRejectConfirm(comment: string) {
    if (!currentUserLine) return;
    rejectMutation.mutate(
      { lineId: currentUserLine.id, comment },
      {
        onSuccess: () => {
          setDialogMode(null);
          navigate('/approvals/pending');
        },
      },
    );
  }

  function handleWithdrawConfirm() {
    withdrawMutation.mutate(doc.id, {
      onSuccess: () => {
        setShowWithdrawConfirm(false);
        navigate('/documents/my');
      },
    });
  }

  function handleResubmitConfirm() {
    rewriteMutation.mutate(doc.id, {
      onSuccess: (data) => {
        setShowResubmitConfirm(false);
        const newDocId = (data as { data?: { id?: number } })?.data?.id ?? (data as { id?: number })?.id;
        if (newDocId) {
          navigate(`/documents/${newDocId}`);
        } else {
          navigate('/documents/my');
        }
      },
    });
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        {isCurrentApprover && (
          <>
            <button
              type="button"
              onClick={() => setDialogMode('approve')}
              className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-5 rounded-lg text-sm font-medium"
            >
              결재하기
            </button>
            <button
              type="button"
              onClick={() => setDialogMode('reject')}
              className="bg-white border border-red-300 text-red-600 hover:bg-red-50 h-11 px-5 rounded-lg text-sm font-medium"
            >
              반려하기
            </button>
          </>
        )}
        <div className="flex-1" />
        {canWithdraw && (
          <button
            type="button"
            onClick={() => setShowWithdrawConfirm(true)}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 h-11 px-5 rounded-lg text-sm font-medium"
          >
            문서 회수
          </button>
        )}
        {canResubmit && (
          <button
            type="button"
            onClick={() => setShowResubmitConfirm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-5 rounded-lg text-sm font-medium"
          >
            재기안하기
          </button>
        )}
      </div>

      {/* Approve/Reject comment dialog */}
      {dialogMode && (
        <ApprovalCommentDialog
          isOpen={!!dialogMode}
          onClose={() => setDialogMode(null)}
          onConfirm={dialogMode === 'approve' ? handleApproveConfirm : handleRejectConfirm}
          mode={dialogMode}
          isLoading={
            dialogMode === 'approve'
              ? approveMutation.isPending
              : rejectMutation.isPending
          }
        />
      )}

      {/* Withdrawal confirmation */}
      <ConfirmDialog
        open={showWithdrawConfirm}
        onClose={() => setShowWithdrawConfirm(false)}
        onConfirm={handleWithdrawConfirm}
        title="문서 회수"
        message="제출된 문서를 회수하시겠습니까? 회수 후 다시 수정하여 제출할 수 있습니다."
        confirmLabel="회수하기"
        confirmVariant="danger"
        isLoading={withdrawMutation.isPending}
      />

      {/* Resubmit confirmation */}
      <ConfirmDialog
        open={showResubmitConfirm}
        onClose={() => setShowResubmitConfirm(false)}
        onConfirm={handleResubmitConfirm}
        title="재기안"
        message="이 문서를 기반으로 새로운 문서를 작성하시겠습니까? 첨부파일은 복사되지 않습니다."
        confirmLabel="재기안하기"
        confirmVariant="primary"
        isLoading={rewriteMutation.isPending}
      />
    </>
  );
}
