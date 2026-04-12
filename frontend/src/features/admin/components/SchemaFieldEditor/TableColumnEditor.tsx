import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, ChevronRight, Trash2 } from 'lucide-react';
import type { TableColumn, TableColumnType } from './types';
import { COLUMN_TYPES, COLUMN_TYPE_META, SMALL_INPUT_CLASS } from './constants';
import { ColumnConfigPanel } from './ColumnConfigPanel';

interface TableColumnEditorProps {
  columns: TableColumn[];
  onColumnsChange: (columns: TableColumn[]) => void;
  minRows?: number;
  maxRows?: number;
  onMinRowsChange: (val: number | undefined) => void;
  onMaxRowsChange: (val: number | undefined) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SortableColumnRow({
  column,
  expanded,
  onToggle,
  onDelete,
  onUpdate,
}: {
  column: TableColumn;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updated: TableColumn) => void;
}) {
  const { t } = useTranslation('admin');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const meta = COLUMN_TYPE_META[column.type];
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        expanded
          ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg'
          : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors'
      }
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={onToggle}
      >
        <button
          type="button"
          className="shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab"
          aria-label={t('templates.reorderColumn')}
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${meta.bgColor} ${meta.color}`}
        >
          <Icon className="w-3 h-3" />
          {t(`templates.columnType${capitalize(column.type)}`)}
        </span>
        <span className="text-sm text-gray-900 dark:text-gray-50 truncate flex-1">
          {column.label || (
            <span className="text-gray-400 dark:text-gray-500 italic">
              {t('templates.noLabel')}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          title={t('templates.removeField')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 pt-2 space-y-3 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.columnLabel')}
              </label>
              <input
                type="text"
                value={column.label}
                onChange={(e) => onUpdate({ ...column, label: e.target.value })}
                className={SMALL_INPUT_CLASS}
                placeholder={t('templates.columnLabel')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.columnId')}
              </label>
              <input
                type="text"
                value={column.id}
                onChange={(e) => onUpdate({ ...column, id: e.target.value })}
                className={SMALL_INPUT_CLASS}
                placeholder={t('templates.columnId')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.columnType')}
              </label>
              <select
                value={column.type}
                onChange={(e) =>
                  onUpdate({ ...column, type: e.target.value as TableColumnType, config: {} })
                }
                className={SMALL_INPUT_CLASS}
              >
                {COLUMN_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {t(`templates.columnType${capitalize(ct)}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={column.required}
                  onChange={(e) => onUpdate({ ...column, required: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('templates.fieldRequired')}
                </span>
              </label>
            </div>
          </div>
          {/* Type-specific column settings */}
          <ColumnConfigPanel column={column} onUpdate={(updated) => onUpdate(updated)} />
        </div>
      )}
    </div>
  );
}

export function TableColumnEditor({ columns, onColumnsChange, minRows, maxRows, onMinRowsChange, onMaxRowsChange }: TableColumnEditorProps) {
  const { t } = useTranslation('admin');
  const [expandedColumnId, setExpandedColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  const addColumn = () => {
    if (columns.length >= 20) return;
    const newCol: TableColumn = {
      id: `col_${Date.now().toString(36)}`,
      type: 'text',
      label: '',
      required: false,
      config: {},
    };
    onColumnsChange([...columns, newCol]);
    setExpandedColumnId(newCol.id);
  };

  const deleteColumn = (columnId: string) => {
    onColumnsChange(columns.filter((c) => c.id !== columnId));
    if (expandedColumnId === columnId) setExpandedColumnId(null);
  };

  const updateColumn = (columnId: string, updated: TableColumn) => {
    onColumnsChange(columns.map((c) => (c.id === columnId ? updated : c)));
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {t('templates.columnList')}
        </span>
        <button
          type="button"
          onClick={addColumn}
          disabled={columns.length >= 20}
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={columns.length >= 20 ? t('templates.columnMaxError') : undefined}
        >
          <Plus className="w-3.5 h-3.5" />
          {t('templates.addColumn')}
        </button>
      </div>

      {/* Column list */}
      {columns.length === 0 ? (
        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center text-sm text-gray-400 dark:text-gray-500">
          {t('templates.columnEmpty')}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {columns.map((col) => (
                <SortableColumnRow
                  key={col.id}
                  column={col}
                  expanded={expandedColumnId === col.id}
                  onToggle={() =>
                    setExpandedColumnId(expandedColumnId === col.id ? null : col.id)
                  }
                  onDelete={() => deleteColumn(col.id)}
                  onUpdate={(updated) => updateColumn(col.id, updated)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Row settings */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          {t('templates.rowSettings')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.minRows')}
            </label>
            <input
              type="number"
              value={minRows ?? ''}
              onChange={(e) => onMinRowsChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className={SMALL_INPUT_CLASS}
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.maxRows')}
            </label>
            <input
              type="number"
              value={maxRows ?? ''}
              onChange={(e) => onMaxRowsChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className={SMALL_INPUT_CLASS}
              min={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
