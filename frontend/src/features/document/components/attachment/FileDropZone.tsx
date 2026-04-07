import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function FileDropZone({
  onFilesSelected,
  disabled = false,
  maxFiles,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFilesSelected(files);
    },
    [disabled, onFilesSelected],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) onFilesSelected(files);
      e.target.value = '';
    },
    [onFilesSelected],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="파일 업로드 영역"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`border-2 border-dashed rounded-lg py-10 px-6 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600'
          : isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
        tabIndex={-1}
      />

      <Upload className="h-8 w-8 text-gray-400 mb-2" />

      {isDragging ? (
        <p className="text-sm font-medium text-blue-600">여기에 놓으세요</p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          파일을 드래그하거나{' '}
          <span className="font-semibold text-blue-600 hover:text-blue-700">
            클릭하여 선택
          </span>
          하세요
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        PDF, DOC, XLS, PPT, HWP, JPG, PNG, ZIP (최대 50MB/파일
        {maxFiles ? `, ${maxFiles}개` : ''})
      </p>
    </div>
  );
}
