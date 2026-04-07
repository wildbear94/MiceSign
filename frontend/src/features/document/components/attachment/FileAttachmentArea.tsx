import { useCallback } from 'react';
import { Paperclip } from 'lucide-react';
import type { Attachment } from '../../types/document';
import { useDeleteAttachment, downloadAttachment } from '../../hooks/useAttachments';
import { useFileUpload } from './useFileUpload';
import { formatFileSize, MAX_FILES_PER_DOC, MAX_TOTAL_SIZE } from './fileValidation';
import FileDropZone from './FileDropZone';
import FileItem from './FileItem';

interface FileAttachmentAreaProps {
  documentId: number;
  attachments: Attachment[];
  editable: boolean;
  onAttachmentsChange?: () => void;
}

export default function FileAttachmentArea({
  documentId,
  attachments,
  editable,
  onAttachmentsChange,
}: FileAttachmentAreaProps) {
  const deleteAttachment = useDeleteAttachment(documentId);

  const { uploadItems, addFiles, cancelUpload, validationError } = useFileUpload({
    documentId,
    existingAttachments: attachments,
    onUploadComplete: () => {
      onAttachmentsChange?.();
    },
  });

  // Calculate usage
  const totalCount =
    attachments.length +
    uploadItems.filter((item) => item.status !== 'error').length;
  const totalSize =
    attachments.reduce((sum, a) => sum + a.fileSize, 0) +
    uploadItems
      .filter((item) => item.status !== 'error')
      .reduce((sum, item) => sum + item.file.size, 0);

  const isAtFileLimit = totalCount >= MAX_FILES_PER_DOC;
  const isAtSizeLimit = totalSize >= MAX_TOTAL_SIZE;

  const handleDownload = useCallback(async (attachmentId: number) => {
    try {
      await downloadAttachment(attachmentId);
    } catch {
      // Error handling in API layer
    }
  }, []);

  const handleDelete = useCallback(
    (attachmentId: number) => {
      deleteAttachment.mutate(attachmentId, {
        onSuccess: () => onAttachmentsChange?.(),
      });
    },
    [deleteAttachment, onAttachmentsChange],
  );

  return (
    <section className="space-y-3">
      {/* Section heading */}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        첨부파일
      </h3>

      {/* Drop zone (editor mode only) */}
      {editable && (
        <>
          <FileDropZone
            onFilesSelected={addFiles}
            disabled={isAtFileLimit}
            maxFiles={MAX_FILES_PER_DOC}
          />

          {validationError && (
            <p className="text-xs text-red-600" role="alert">
              {validationError}
            </p>
          )}
        </>
      )}

      {/* File list */}
      {(attachments.length > 0 || uploadItems.length > 0) && (
        <div role="list" className="space-y-2">
          {/* Uploading files first */}
          {uploadItems.map((item) => (
            <FileItem
              key={item.id}
              uploadItem={item}
              onDelete={item.status === 'uploading' ? () => cancelUpload(item.id) : undefined}
            />
          ))}

          {/* Existing attachments */}
          {attachments.map((attachment) => (
            <FileItem
              key={attachment.id}
              attachment={attachment}
              onDelete={editable ? () => handleDelete(attachment.id) : undefined}
              onDownload={!editable ? () => handleDownload(attachment.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Empty state (read-only) */}
      {!editable && attachments.length === 0 && uploadItems.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          첨부파일이 없습니다.
        </p>
      )}

      {/* Usage status */}
      {editable && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className={isAtFileLimit ? 'text-red-600' : ''}>
            {totalCount}/{MAX_FILES_PER_DOC}개
          </span>
          {' / '}
          <span className={isAtSizeLimit ? 'text-red-600' : ''}>
            {formatFileSize(totalSize)}/{formatFileSize(MAX_TOTAL_SIZE)}
          </span>
        </p>
      )}

      {!editable && attachments.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {attachments.length}개 파일 ({formatFileSize(attachments.reduce((sum, a) => sum + a.fileSize, 0))})
        </p>
      )}
    </section>
  );
}
