import { useCallback, useMemo, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ArrowLeft,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import DocumentStatusBadge from '../components/DocumentStatusBadge';
import TemplateBadge from '../components/TemplateBadge';
import ApprovalStatusDisplay from '../components/approval/ApprovalStatusDisplay';
import ApprovalActionBar from '../components/approval/ApprovalActionBar';
import FileAttachmentArea from '../components/attachment/FileAttachmentArea';
import { TEMPLATE_REGISTRY, isHardcodedTemplate } from '../components/templates/templateRegistry';
import DynamicReadOnly from '../components/templates/DynamicReadOnly';
import {
  useDocument,
  useWithdrawDocument,
  useRewriteDocument,
  useDeleteDocument,
  useSubmitDocument,
} from '../hooks/useDocuments';
import { useApprove, useReject } from '../../approval/hooks/useApprovals';
import { useAuthStore } from '../../../stores/authStore';

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const documentId = id ? Number(id) : null;
  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? 0;

  const { data: doc, isLoading, isError, refetch } = useDocument(documentId);

  const withdrawMutation = useWithdrawDocument();
  const rewriteMutation = useRewriteDocument();
  const deleteMutation = useDeleteDocument();
  const submitMutation = useSubmitDocument();
  const approveMutation = useApprove();
  const rejectMutation = useReject();

  // Handle approval actions
  const handleApprove = useCallback(
    (comment: string) => {
      if (!doc) return;
      const line = doc.approvalLines.find(
        (l) =>
          l.approverId === currentUserId &&
          l.status === 'PENDING' &&
          doc.currentStep !== null &&
          l.stepOrder === doc.currentStep,
      );
      if (!line) return;
      approveMutation.mutate(
        { lineId: line.id, req: comment ? { comment } : undefined },
        { onSuccess: () => refetch() },
      );
    },
    [doc, currentUserId, approveMutation, refetch],
  );

  const handleReject = useCallback(
    (comment: string) => {
      if (!doc) return;
      const line = doc.approvalLines.find(
        (l) =>
          l.approverId === currentUserId &&
          l.status === 'PENDING' &&
          doc.currentStep !== null &&
          l.stepOrder === doc.currentStep,
      );
      if (!line) return;
      rejectMutation.mutate(
        { lineId: line.id, req: { comment } },
        { onSuccess: () => refetch() },
      );
    },
    [doc, currentUserId, rejectMutation, refetch],
  );

  const handleWithdraw = useCallback(() => {
    if (!documentId) return;
    withdrawMutation.mutate(documentId, {
      onSuccess: () => refetch(),
    });
  }, [documentId, withdrawMutation, refetch]);

  const handleRewrite = useCallback(() => {
    if (!documentId) return;
    rewriteMutation.mutate(documentId, {
      onSuccess: (newDoc) => {
        navigate(`/documents/${newDoc.id}/edit`);
      },
    });
  }, [documentId, rewriteMutation, navigate]);

  const handleEdit = useCallback(() => {
    if (!documentId) return;
    navigate(`/documents/${documentId}/edit`);
  }, [documentId, navigate]);

  const handleDelete = useCallback(() => {
    if (!documentId) return;
    deleteMutation.mutate(documentId, {
      onSuccess: () => navigate('/documents/my'),
    });
  }, [documentId, deleteMutation, navigate]);

  const handleSubmit = useCallback(() => {
    if (!documentId) return;
    submitMutation.mutate(documentId, {
      onSuccess: () => refetch(),
    });
  }, [documentId, submitMutation, refetch]);

  // Determine rendering mode for body
  const useHardcoded = useMemo(() => {
    if (!doc) return false;
    return isHardcodedTemplate(doc.templateCode) && !doc.schemaDefinitionSnapshot;
  }, [doc]);

  const templateEntry = doc ? TEMPLATE_REGISTRY[doc.templateCode] : null;
  const ReadOnlyComponent = useHardcoded ? templateEntry?.readOnly : null;

  // Loading state
  if (isLoading || !doc) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
          문서를 불러오는데 실패했습니다.
        </p>
        <button
          type="button"
          onClick={() => navigate('/documents/my')}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // DRAFT documents: redirect to editor
  if (doc.status === 'DRAFT') {
    navigate(`/documents/${doc.id}/edit`, { replace: true });
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate('/documents/my')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </button>

      {/* Document header */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 flex-1 mr-4">
            {doc.title}
          </h1>
          <DocumentStatusBadge status={doc.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
              문서번호
            </span>
            <span className="text-gray-900 dark:text-gray-50 font-mono">
              {doc.docNumber ?? '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
              양식
            </span>
            <TemplateBadge code={doc.templateCode} name={doc.templateName} />
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
              기안자
            </span>
            <span className="text-gray-900 dark:text-gray-50">
              {doc.drafterName}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 block">
              {doc.departmentName} / {doc.positionName}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
              작성일
            </span>
            <span className="text-gray-900 dark:text-gray-50">
              {formatDateTime(doc.createdAt)}
            </span>
          </div>

          {doc.submittedAt && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
                상신일
              </span>
              <span className="text-gray-900 dark:text-gray-50">
                {formatDateTime(doc.submittedAt)}
              </span>
            </div>
          )}

          {doc.completedAt && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-0.5">
                완료일
              </span>
              <span className="text-gray-900 dark:text-gray-50">
                {formatDateTime(doc.completedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Source document link */}
        {doc.sourceDocId && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={`/documents/${doc.sourceDocId}`}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              원본 문서 보기
            </Link>
          </div>
        )}
      </div>

      {/* Document body */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          문서 내용
        </h2>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          }
        >
          {ReadOnlyComponent ? (
            <ReadOnlyComponent
              formData={doc.formData}
              bodyHtml={doc.bodyHtml}
            />
          ) : doc.schemaDefinitionSnapshot ? (
            <DynamicReadOnly
              schemaDefinition={doc.schemaDefinitionSnapshot}
              formData={doc.formData}
            />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              알 수 없는 양식입니다.
            </p>
          )}
        </Suspense>
      </div>

      {/* Approval status */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">
          결재 현황
        </h2>
        <ApprovalStatusDisplay
          approvalLines={doc.approvalLines}
          currentStep={doc.currentStep}
        />
      </div>

      {/* Attachments */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        <FileAttachmentArea
          documentId={doc.id}
          attachments={doc.attachments}
          editable={false}
        />
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 -mx-0 rounded-b-xl">
        <ApprovalActionBar
          document={doc}
          currentUserId={currentUserId}
          onApprove={handleApprove}
          onReject={handleReject}
          onWithdraw={handleWithdraw}
          onRewrite={handleRewrite}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />
      </div>
    </div>
  );
}
