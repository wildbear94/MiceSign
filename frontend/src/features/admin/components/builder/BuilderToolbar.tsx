import { useState } from 'react';
import { ArrowLeft, Save, Loader2, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BuilderToolbarProps {
  templateName: string;
  isDirty: boolean;
  isPreview: boolean;
  isSaving: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  onBack: () => void;
  onJsonImport: () => void;
  onJsonExport: () => void;
}

export default function BuilderToolbar({
  templateName,
  isDirty,
  isPreview,
  isSaving,
  onTogglePreview,
  onSave,
  onBack,
  onJsonImport,
  onJsonExport,
}: BuilderToolbarProps) {
  const { t } = useTranslation('admin');
  const [jsonMenuOpen, setJsonMenuOpen] = useState(false);

  return (
    <div className="h-14 flex items-center justify-between px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
      {/* Left: Back button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('templates.backToList')}
        </button>
      </div>

      {/* Center: Template name */}
      <div className="flex items-center">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {templateName}
        </span>
        {isDirty && <span className="ml-1 text-blue-600">*</span>}
      </div>

      {/* Right: JSON dropdown + Preview toggle + Save */}
      <div className="flex items-center gap-2">
        {/* JSON dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setJsonMenuOpen((p) => !p)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="JSON"
          >
            <Download className="h-4 w-4" />
          </button>
          {jsonMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setJsonMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  type="button"
                  onClick={() => {
                    onJsonExport();
                    setJsonMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('templates.jsonExport')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onJsonImport();
                    setJsonMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t('templates.jsonImport')}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Preview toggle */}
        <div className="flex">
          <button
            type="button"
            onClick={() => {
              if (isPreview) onTogglePreview();
            }}
            className={`px-3 py-1.5 text-sm font-semibold rounded-l-lg border border-r-0 ${
              !isPreview
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}
          >
            {t('templates.editMode')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isPreview) onTogglePreview();
            }}
            className={`px-3 py-1.5 text-sm font-semibold rounded-r-lg border ${
              isPreview
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}
          >
            {t('templates.previewMode')}
          </button>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t('templates.save')}
        </button>
      </div>
    </div>
  );
}
