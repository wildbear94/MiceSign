import type { Dispatch } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { BuilderState, BuilderAction } from './useBuilderReducer';
import { createField } from './useBuilderReducer';
import type { FieldType } from '../../../document/types/dynamicForm';
import BuilderToolbar from './BuilderToolbar';
import BuilderCanvas from './BuilderCanvas';
import FieldPalette from './FieldPalette';
import PropertyPanel from './PropertyPanel';

interface BuilderLayoutProps {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
  templateName: string;
  onSave: (schema: string) => void;
}

export default function BuilderLayout({
  state,
  dispatch,
  templateName,
  onSave,
}: BuilderLayoutProps) {
  const selectedField = state.fields.find((f) => f.id === state.selectedFieldId) ?? null;

  function handleDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    // Dragging from palette to canvas
    if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
      const fieldType = source.draggableId.replace('palette-', '') as FieldType;
      const newField = createField(fieldType);
      // Insert at destination index
      const fields = [...state.fields];
      fields.splice(destination.index, 0, newField);
      dispatch({ type: 'LOAD_SCHEMA', fields });
      dispatch({ type: 'SELECT_FIELD', fieldId: newField.id });
      return;
    }

    // Reordering within canvas
    if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      if (source.index === destination.index) return;
      dispatch({
        type: 'REORDER_FIELDS',
        sourceIndex: source.index,
        destIndex: destination.index,
      });
    }
  }

  function handleSave() {
    const schema = JSON.stringify({ fields: state.fields }, null, 2);
    onSave(schema);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Toolbar */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <BuilderToolbar
            templateName={templateName}
            isDirty={state.isDirty}
            isPreview={state.isPreview}
            isSaving={false}
            onTogglePreview={() =>
              dispatch({ type: 'SET_PREVIEW', isPreview: !state.isPreview })
            }
            onSave={handleSave}
            onBack={() => window.history.back()}
            onJsonImport={() => {}}
            onJsonExport={() => {}}
          />
        </div>

        {/* Body: 3-column */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Palette (240px) */}
          {!state.isPreview && (
            <div className="w-[240px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
              <FieldPalette dispatch={dispatch} />
            </div>
          )}

          {/* Center panel: Canvas */}
          <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-800">
            <BuilderCanvas
              fields={state.fields}
              selectedFieldId={state.selectedFieldId}
              dispatch={dispatch}
              isPreview={state.isPreview}
            />
          </div>

          {/* Right panel: Property (320px) */}
          {!state.isPreview && selectedField && (
            <div className="w-[320px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
              <PropertyPanel
                field={selectedField}
                allFields={state.fields}
                dispatch={dispatch}
              />
            </div>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}
