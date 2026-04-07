import type { Dispatch } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  List,
  Table,
  FileText,
  EyeOff,
  Minus,
} from 'lucide-react';
import type { FieldType } from '../../../document/types/dynamicForm';
import type { BuilderAction } from './useBuilderReducer';
import { createField } from './useBuilderReducer';
import type { ReactNode } from 'react';

interface FieldPaletteProps {
  dispatch: Dispatch<BuilderAction>;
}

interface PaletteGroup {
  label: string;
  items: { type: FieldType; label: string; icon: ReactNode }[];
}

const PALETTE_GROUPS: PaletteGroup[] = [
  {
    label: '기본 필드',
    items: [
      { type: 'text', label: '텍스트', icon: <Type className="w-4 h-4" /> },
      { type: 'textarea', label: '장문 텍스트', icon: <AlignLeft className="w-4 h-4" /> },
      { type: 'number', label: '숫자', icon: <Hash className="w-4 h-4" /> },
      { type: 'date', label: '날짜', icon: <Calendar className="w-4 h-4" /> },
    ],
  },
  {
    label: '선택',
    items: [
      { type: 'select', label: '선택 필드', icon: <List className="w-4 h-4" /> },
    ],
  },
  {
    label: '테이블',
    items: [
      { type: 'table', label: '테이블', icon: <Table className="w-4 h-4" /> },
    ],
  },
  {
    label: '레이아웃',
    items: [
      { type: 'section', label: '섹션 구분', icon: <Minus className="w-4 h-4" /> },
      { type: 'staticText', label: '안내 문구', icon: <FileText className="w-4 h-4" /> },
      { type: 'hidden', label: '숨김 필드', icon: <EyeOff className="w-4 h-4" /> },
    ],
  },
];

// Flat list for drag indexing
const ALL_ITEMS = PALETTE_GROUPS.flatMap((g) => g.items);

export default function FieldPalette({ dispatch }: FieldPaletteProps) {
  function handleClickAdd(fieldType: FieldType) {
    dispatch({ type: 'ADD_FIELD', field: createField(fieldType) });
  }

  let globalIndex = 0;

  return (
    <div className="p-3">
      <Droppable droppableId="palette" isDropDisabled type="FIELD">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {PALETTE_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                <h3 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const idx = ALL_ITEMS.findIndex((i) => i.type === item.type);
                    return (
                      <Draggable
                        key={item.type}
                        draggableId={`palette-${item.type}`}
                        index={idx}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => handleClickAdd(item.type)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-grab text-sm select-none transition-colors ${
                              snapshot.isDragging
                                ? 'bg-blue-50 dark:bg-blue-900/30 shadow-md ring-1 ring-blue-300'
                                : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <span className="text-gray-500 dark:text-gray-400">
                              {item.icon}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {item.label}
                            </span>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
              </div>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
