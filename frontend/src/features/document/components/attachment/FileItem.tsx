import { useState } from 'react';
import { X, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import type { Attachment, FileUploadItem } from '../../types/document';
import { getFileIcon } from './fileIcons';
import { formatFileSize } from './fileValidation';

interface FileItemProps {
  attachment?: Attachment;
  uploadItem?: FileUploadItem;
  onDownload?: () => void;
  onDelete?: () => void;
  isUploading?: boolean;
  progress?: number;
}

export default function FileItem({
  attachment,
  uploadItem,
  onDownload,
  onDelete,
}: FileItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const filename = attachment?.originalName ?? uploadItem?.file.name ?? '';
  const fileSize = attachment?.fileSize ?? uploadItem?.file.size ?? 0;
  const { icon: FileIcon, label: iconLabel } = getFileIcon(filename);

  const isUploading = uploadItem?.status === 'uploading';
  const isComplete = uploadItem?.status === 'complete';
  const isError = uploadItem?.status === 'error';

  const handleDownload = async () => {
    if (!onDownload) return;
    setIsDownloading(true);
    try {
      onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      role="listitem"
      className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      {/* File type icon */}
      <FileIcon
        className="h-5 w-5 text-gray-500 dark:text-gray-400 shrink-0"
        aria-label={iconLabel}
      />

      {/* Filename + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-50 truncate">{filename}</p>

        {/* Upload progress bar */}
        {isUploading && uploadItem && (
          <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
            <div
              className="h-1 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${uploadItem.progress}%` }}
            />
          </div>
        )}

        {/* Error message */}
        {isError && uploadItem?.error && (
          <p className="text-xs text-red-600 mt-1">{uploadItem.error}</p>
        )}
      </div>

      {/* File size */}
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
        {formatFileSize(fileSize)}
      </span>

      {/* Status icons */}
      {isComplete && <Check className="h-4 w-4 text-green-600 shrink-0" />}
      {isError && <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}

      {/* Delete button */}
      {onDelete && !isUploading && (
        <button
          type="button"
          onClick={onDelete}
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 shrink-0"
          aria-label="파일 삭제"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Download button */}
      {onDownload && !uploadItem && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0 flex items-center gap-1"
          aria-label="파일 다운로드"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          다운로드
        </button>
      )}
    </div>
  );
}
