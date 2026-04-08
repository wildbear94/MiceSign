import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DocumentStatus } from '../../types/document';
import { useAttachments, useDeleteAttachment } from '../../hooks/useAttachments';
import { useFileUpload } from './useFileUpload';
import { attachmentApi } from '../../api/attachmentApi';
import { formatFileSize, MAX_FILES, MAX_TOTAL_SIZE } from './fileValidation';
import FileDropZone from './FileDropZone';
import FileItem from './FileItem';

interface FileAttachmentAreaProps {
  documentId: number;
  documentStatus: DocumentStatus;
  readOnly: boolean;
}

export default function FileAttachmentArea({
  documentId,
  documentStatus: _documentStatus,
  readOnly,
}: FileAttachmentAreaProps) {
  const { t } = useTranslation('document');
  const { data: existingAttachments = [], refetch } = useAttachments(documentId);
  const deleteAttachment = useDeleteAttachment(documentId);

  const { uploadItems, addFiles, cancelUpload, validationError } = useFileUpload({
    documentId,
    existingAttachments,
    onUploadComplete: () => {
      refetch();
    },
  });

  // Calculate usage
  const totalCount =
    existingAttachments.length +
    uploadItems.filter((item) => item.status !== 'error').length;
  const totalSize =
    existingAttachments.reduce((sum, a) => sum + a.fileSize, 0) +
    uploadItems
      .filter((item) => item.status !== 'error')
      .reduce((sum, item) => sum + item.file.size, 0);

  const isAtFileLimit = totalCount >= MAX_FILES;
  const isAtSizeLimit = totalSize >= MAX_TOTAL_SIZE;

  // Download handler
  const handleDownload = useCallback(async (attachmentId: number) => {
    try {
      const { blob, filename } = await attachmentApi.download(attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Error handling is in the API layer
    }
  }, []);

  // Delete handler (no confirmation per D-09)
  const handleDelete = useCallback(
    (attachmentId: number) => {
      deleteAttachment.mutate(attachmentId);
    },
    [deleteAttachment],
  );

  return (
    <section className="space-y-3">
      {/* Section heading */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {t('attachment.title')}
      </h3>

      {/* Editor mode */}
      {!readOnly && (
        <>
          <FileDropZone
            onFilesSelected={addFiles}
            disabled={isAtFileLimit}
          />

          {/* Validation error */}
          {validationError && (
            <p
              className="text-xs text-red-600"
              aria-live="assertive"
              role="alert"
            >
              {validationError}
            </p>
          )}
        </>
      )}

      {/* File list */}
      {(existingAttachments.length > 0 || uploadItems.length > 0) && (
        <div role="list" className="space-y-2">
          {/* Uploading files first */}
          {uploadItems.map((item) => (
            <FileItem
              key={item.id}
              uploadItem={item}
              readOnly={readOnly}
              onCancelUpload={cancelUpload}
            />
          ))}

          {/* Existing attachments */}
          {existingAttachments.map((attachment) => (
            <FileItem
              key={attachment.id}
              attachment={attachment}
              readOnly={readOnly}
              onDelete={!readOnly ? handleDelete : undefined}
              onDownload={readOnly ? handleDownload : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty state (read-only) */}
      {readOnly && existingAttachments.length === 0 && uploadItems.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t('attachment.status.empty')}
        </p>
      )}

      {/* Usage status line */}
      {!readOnly && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('attachment.status.editor', {
            count: totalCount,
            size: formatFileSize(totalSize),
          }).split('/').map((part, index) => {
            // Highlight count or size in red when at limit
            if (index === 0 && isAtFileLimit) {
              return <span key={index} className="text-red-600">{part}/</span>;
            }
            if (index === 1) {
              const [before, after] = part.split('200MB');
              if (isAtSizeLimit) {
                return (
                  <span key={index}>
                    {before}<span className="text-red-600">200MB</span>{after}
                    {index < 2 ? '/' : ''}
                  </span>
                );
              }
            }
            return <span key={index}>{part}{index < 2 ? '/' : ''}</span>;
          })}
        </p>
      )}

      {readOnly && existingAttachments.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('attachment.status.readOnly', {
            count: existingAttachments.length,
            size: formatFileSize(
              existingAttachments.reduce((sum, a) => sum + a.fileSize, 0),
            ),
          })}
        </p>
      )}
    </section>
  );
}
