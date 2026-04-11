import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { SchemaField } from '../SchemaFieldEditor/types';
import FormPreview from './FormPreview';

interface FullscreenPreviewPortalProps {
  fields: SchemaField[];
  templateName?: string;
  onClose: () => void;
}

export default function FullscreenPreviewPortal({
  fields,
  templateName,
  onClose,
}: FullscreenPreviewPortalProps) {
  const { t } = useTranslation('admin');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-100 dark:bg-gray-900 rounded-xl w-[90vw] h-[90vh] overflow-y-auto p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title={t('templates.previewClose')}
        >
          <X className="w-5 h-5" />
        </button>
        <FormPreview fields={fields} templateName={templateName} />
      </div>
    </div>,
    document.body,
  );
}
