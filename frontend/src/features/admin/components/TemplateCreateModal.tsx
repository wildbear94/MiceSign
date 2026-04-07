import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CreateTemplateRequest } from '../types/builder';

interface TemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateTemplateRequest) => void;
  isPending?: boolean;
  isError?: boolean;
}

export default function TemplateCreateModal({
  isOpen,
  onClose,
  onCreate,
  isPending = false,
  isError = false,
}: TemplateCreateModalProps) {
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = '양식 이름을 입력해주세요.';
    if (!prefix.trim()) {
      next.prefix = '접두어를 입력해주세요.';
    } else if (prefix.length > 10) {
      next.prefix = '접두어는 10자 이내로 입력해주세요.';
    } else if (!/^[A-Z]+$/.test(prefix)) {
      next.prefix = '접두어는 영문 대문자만 사용 가능합니다.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onCreate({
      name: name.trim(),
      prefix: prefix.trim().toUpperCase(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });
  }

  function resetForm() {
    setName('');
    setPrefix('');
    setDescription('');
    setCategory('');
    setBudgetEnabled(false);
    setErrors({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-template-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-md w-full mx-4 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="create-template-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-50"
          >
            새 양식 만들기
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              양식 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 출장 보고서"
              className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Prefix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              접두어 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="예: TRIP"
              maxLength={10}
              className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
            />
            <p className="mt-1 text-xs text-gray-500">
              영문 대문자, 최대 10자 (예: TRIP-2026-0001)
            </p>
            {errors.prefix && (
              <p className="mt-1 text-xs text-red-500">{errors.prefix}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="양식에 대한 설명 (선택사항)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              카테고리
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 총무, 인사, 경비 (선택사항)"
              className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Budget toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={budgetEnabled}
              onChange={(e) => setBudgetEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              예산 연동
            </span>
          </label>

          {/* Error from server */}
          {isError && (
            <p className="text-sm text-red-500">
              양식 생성에 실패했습니다. 다시 시도해주세요.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
