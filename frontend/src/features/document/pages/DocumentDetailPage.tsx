import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import DocumentStatusBadge from '../components/DocumentStatusBadge';
import TemplateBadge from '../components/TemplateBadge';
import { TEMPLATE_REGISTRY } from '../components/templates/templateRegistry';
import { useDocumentDetail } from '../hooks/useDocuments';
import DocumentEditorPage from './DocumentEditorPage';

export default function DocumentDetailPage() {
  const { t } = useTranslation('document');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const documentId = id ? Number(id) : null;

  const { data: doc, isLoading } = useDocumentDetail(documentId);

  // Loading state
  if (isLoading || !doc) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  // DRAFT documents: redirect to editor mode
  if (doc.status === 'DRAFT') {
    return <DocumentEditorPage />;
  }

  // Non-DRAFT: render read-only view
  const templateEntry = TEMPLATE_REGISTRY[doc.templateCode];
  const ReadOnlyComponent = templateEntry?.readOnlyComponent;

  function formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        {t('backToList')}
      </button>

      {/* Meta info section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-3">
          {doc.title}
        </h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">양식</span>
            <TemplateBadge templateCode={doc.templateCode} />
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">상태</span>
            <DocumentStatusBadge status={doc.status} />
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">기안자</span>
            <span className="text-gray-900 dark:text-gray-50">
              {doc.drafter.name} ({doc.drafter.departmentName})
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">문서번호</span>
            <span className="text-gray-900 dark:text-gray-50">{doc.docNumber ?? '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block mb-0.5">작성일</span>
            <span className="text-gray-900 dark:text-gray-50">{formatDate(doc.createdAt)}</span>
          </div>
          {doc.submittedAt && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 block mb-0.5">제출일</span>
              <span className="text-gray-900 dark:text-gray-50">{formatDate(doc.submittedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
        {ReadOnlyComponent ? (
          <ReadOnlyComponent
            title={doc.title}
            bodyHtml={doc.bodyHtml}
            formData={doc.formData}
          />
        ) : (
          <p className="text-sm text-gray-400">알 수 없는 양식입니다.</p>
        )}
      </div>

      {/* Approval line placeholder */}
      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-sm text-gray-400 mb-4">
        {t('placeholder.approvalLine')}
      </div>

      {/* Attachments placeholder */}
      <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-sm text-gray-400">
        {t('placeholder.attachments')}
      </div>
    </div>
  );
}
