import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Receipt,
  CalendarDays,
  ShoppingCart,
  Plane,
  Clock,
  X,
} from 'lucide-react';
import type { Template } from '../types/document';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
  templates: Template[];
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  GENERAL: <FileText className="h-8 w-8" />,
  EXPENSE: <Receipt className="h-8 w-8" />,
  LEAVE: <CalendarDays className="h-8 w-8" />,
  PURCHASE: <ShoppingCart className="h-8 w-8" />,
  BUSINESS_TRIP: <Plane className="h-8 w-8" />,
  OVERTIME: <Clock className="h-8 w-8" />,
};

export default function TemplateSelectionModal({
  isOpen,
  onClose,
  onSelect,
  templates,
}: TemplateSelectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract unique categories
  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean)),
  ) as string[];
  const hasCategories = categories.length > 0;

  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    firstFocusable?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Reset category when modal opens
  useEffect(() => {
    if (isOpen) setSelectedCategory(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-modal-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-lg w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2
            id="template-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-50"
          >
            양식 선택
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          작성할 문서의 양식을 선택해주세요.
        </p>

        {/* Category filter tabs */}
        {hasCategories && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Template grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors text-center group"
            >
              <div className="text-gray-400 group-hover:text-blue-500 transition-colors mx-auto w-fit">
                {TEMPLATE_ICONS[template.code] ?? (
                  <FileText className="h-8 w-8" />
                )}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-50 mt-3">
                {template.name}
              </div>
              {template.description && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {template.description}
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            사용 가능한 양식이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
