import {
  ArrowLeft,
  Eye,
  EyeOff,
  Save,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';

interface BuilderToolbarProps {
  templateName: string;
  isDirty: boolean;
  isPreview: boolean;
  isSaving?: boolean;
  onTogglePreview: () => void;
  onSave: () => void;
  onBack?: () => void;
  onJsonImport?: () => void;
  onJsonExport?: () => void;
}

export default function BuilderToolbar({
  templateName,
  isDirty,
  isPreview,
  isSaving = false,
  onTogglePreview,
  onSave,
  onBack,
  onJsonImport,
  onJsonExport,
}: BuilderToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 h-12">
      {/* Left */}
      <div className="flex items-center gap-3">
        {onBack && (
          <>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              목록
            </button>
            <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
          </>
        )}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
          {templateName || '새 양식'}
        </span>
        {isDirty && (
          <span
            className="text-sm text-amber-500 font-bold"
            title="저장되지 않은 변경사항"
          >
            *
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {onJsonImport && (
          <button
            type="button"
            onClick={onJsonImport}
            className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="JSON 가져오기"
          >
            <Upload className="w-3.5 h-3.5" />
            가져오기
          </button>
        )}
        {onJsonExport && (
          <button
            type="button"
            onClick={onJsonExport}
            className="flex items-center gap-1 h-8 px-3 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="JSON 내보내기"
          >
            <Download className="w-3.5 h-3.5" />
            내보내기
          </button>
        )}
        <div className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
        <button
          type="button"
          onClick={onTogglePreview}
          className={`flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
            isPreview
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {isPreview ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {isPreview ? '편집' : '미리보기'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-1 h-8 px-4 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          저장
        </button>
      </div>
    </div>
  );
}
