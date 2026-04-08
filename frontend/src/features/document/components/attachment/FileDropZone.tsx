import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

export default function FileDropZone({ onFilesSelected, disabled }: FileDropZoneProps) {
  const { t } = useTranslation('document');
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
      // Reset so the same file can be re-selected
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
      aria-label={t('attachment.dropZone.text') + ' ' + t('attachment.dropZone.browse') + t('attachment.dropZone.browseSuffix')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`border-2 border-dashed rounded-lg py-12 px-6 text-center flex flex-col items-center justify-center cursor-pointer transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed border-gray-300'
          : isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 bg-transparent hover:border-gray-400'
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

      <Upload className="h-10 w-10 text-gray-400 mb-3" />

      {isDragging ? (
        <p className="text-sm font-medium text-blue-600">
          {t('attachment.dropZone.dragOver')}
        </p>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('attachment.dropZone.text')}{' '}
          <span className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
            {t('attachment.dropZone.browse')}
          </span>
          {t('attachment.dropZone.browseSuffix')}
        </p>
      )}

      <p className="text-xs text-gray-400 mt-2">
        {t('attachment.dropZone.constraints')}
      </p>
    </div>
  );
}
