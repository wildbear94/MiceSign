import { useState } from 'react';
import { X, Upload } from 'lucide-react';

interface JsonImportModalProps {
  isOpen: boolean;
  onImport: (schema: string) => void;
  onClose: () => void;
}

export default function JsonImportModal({
  isOpen,
  onImport,
  onClose,
}: JsonImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleValidateAndImport() {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);

      // Basic validation
      if (!parsed || typeof parsed !== 'object') {
        setError('유효한 JSON 객체가 아닙니다.');
        return;
      }
      if (!Array.isArray(parsed.fields)) {
        setError('"fields" 배열이 필요합니다.');
        return;
      }

      // Validate each field has required properties
      for (let i = 0; i < parsed.fields.length; i++) {
        const f = parsed.fields[i];
        if (!f.id || !f.type || !f.label) {
          setError(
            `fields[${i}]에 필수 속성(id, type, label)이 누락되었습니다.`,
          );
          return;
        }
      }

      onImport(jsonText);
      setJsonText('');
      setError(null);
      onClose();
    } catch {
      setError('유효하지 않은 JSON 형식입니다.');
    }
  }

  function handleClose() {
    setJsonText('');
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-lg w-full mx-4 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            JSON 스키마 가져오기
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            placeholder='{"fields": [{"id": "...", "type": "text", "label": "..."}]}'
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleValidateAndImport}
              disabled={!jsonText.trim()}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              가져오기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
