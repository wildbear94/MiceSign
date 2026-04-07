import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  FilePlus,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { DocumentDetail } from '../../types/document';
import ApprovalCommentDialog from './ApprovalCommentDialog';
import ConfirmDialog from '../../../admin/components/ConfirmDialog';

interface ApprovalActionBarProps {
  document: DocumentDetail;
  currentUserId: number;
  onApprove: (comment: string) => void;
  onReject: (comment: string) => void;
  onWithdraw: () => void;
  onRewrite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export default function ApprovalActionBar({
  document: doc,
  currentUserId,
  onApprove,
  onReject,
  onWithdraw,
  onRewrite,
  onEdit,
  onDelete,
  onSubmit,
  isApproving = false,
  isRejecting = false,
}: ApprovalActionBarProps) {
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isDrafter = doc.drafterId === currentUserId;
  const approvalLines = doc.approvalLines ?? [];
  const currentStep = doc.currentStep ?? null;

  // Find the current user's pending approval line at the current step
  const currentApprovalLine = approvalLines.find(
    (line) =>
      line.approverId === currentUserId &&
      line.status === 'PENDING' &&
      currentStep !== null &&
      line.stepOrder === currentStep,
  );
  const isCurrentApprover = doc.status === 'SUBMITTED' && !!currentApprovalLine;

  // Can withdraw: drafter, SUBMITTED, all lines at currentStep are PENDING
  const canWithdraw =
    isDrafter &&
    doc.status === 'SUBMITTED' &&
    currentStep !== null &&
    approvalLines
      .filter((line) => line.stepOrder === currentStep)
      .every((line) => line.status === 'PENDING');

  // Can rewrite: drafter and REJECTED or WITHDRAWN
  const canRewrite =
    isDrafter && (doc.status === 'REJECTED' || doc.status === 'WITHDRAWN');

  // DRAFT actions: drafter only
  const isDraft = doc.status === 'DRAFT' && isDrafter;

  // If nothing is applicable, hide the bar
  if (!isCurrentApprover && !canWithdraw && !canRewrite && !isDraft) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* DRAFT: Edit, Delete, Submit */}
        {isDraft && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              수정
            </button>

            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </button>

            <button
              type="button"
              onClick={onSubmit}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              상신
            </button>
          </>
        )}

        {/* SUBMITTED: Current approver can approve/reject */}
        {isCurrentApprover && (
          <>
            <button
              type="button"
              onClick={() => setApproveDialogOpen(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              승인
            </button>

            <button
              type="button"
              onClick={() => setRejectDialogOpen(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              반려
            </button>
          </>
        )}

        {/* SUBMITTED: Drafter can withdraw */}
        {canWithdraw && (
          <button
            type="button"
            onClick={() => setWithdrawDialogOpen(true)}
            className="h-10 px-4 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            회수
          </button>
        )}

        {/* REJECTED/WITHDRAWN: Drafter can rewrite */}
        {canRewrite && (
          <button
            type="button"
            onClick={onRewrite}
            className="h-10 px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
          >
            <FilePlus className="h-4 w-4" />
            재기안
          </button>
        )}
      </div>

      {/* Approve dialog */}
      <ApprovalCommentDialog
        isOpen={approveDialogOpen}
        action="approve"
        onConfirm={(comment) => {
          onApprove(comment);
          setApproveDialogOpen(false);
        }}
        onCancel={() => setApproveDialogOpen(false)}
        isLoading={isApproving}
      />

      {/* Reject dialog */}
      <ApprovalCommentDialog
        isOpen={rejectDialogOpen}
        action="reject"
        onConfirm={(comment) => {
          onReject(comment);
          setRejectDialogOpen(false);
        }}
        onCancel={() => setRejectDialogOpen(false)}
        isLoading={isRejecting}
      />

      {/* Withdraw confirm dialog */}
      <ConfirmDialog
        open={withdrawDialogOpen}
        onClose={() => setWithdrawDialogOpen(false)}
        onConfirm={() => {
          onWithdraw();
          setWithdrawDialogOpen(false);
        }}
        title="문서 회수"
        message="문서를 회수하시겠습니까? 회수 후에는 재기안이 필요합니다."
        confirmLabel="회수"
        confirmVariant="danger"
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          onDelete();
          setDeleteDialogOpen(false);
        }}
        title="문서 삭제"
        message="임시저장된 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        confirmVariant="danger"
      />
    </>
  );
}
