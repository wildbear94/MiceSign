import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import BuilderLayout from '../components/builder/BuilderLayout';
import FieldPalette from '../components/builder/FieldPalette';
import BuilderCanvas from '../components/builder/BuilderCanvas';
import BuilderToolbar from '../components/builder/BuilderToolbar';
import BuilderPreview from '../components/builder/BuilderPreview';
import { useBuilderReducer } from '../components/builder/useBuilderReducer';
import { useAdminTemplate, useUpdateTemplate } from '../hooks/useAdminTemplates';
import { PALETTE_ITEMS } from '../types/builder';
import type { FieldType, SchemaDefinition } from '../types/builder';

export default function TemplateBuilderPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const templateId = Number(id);

  // Load template data
  const { data: templateData, isLoading } = useAdminTemplate(templateId);

  // Builder state
  const [state, dispatch] = useBuilderReducer();
  const [isPreview, setIsPreview] = useState(false);

  // Initialize builder from API response
  useEffect(() => {
    if (templateData) {
      dispatch({
        type: 'INIT_SCHEMA',
        schema: templateData.schemaDefinition ?? {
          version: 1,
          fields: [],
          conditionalRules: [],
          calculationRules: [],
        },
        settings: {
          name: templateData.name,
          prefix: templateData.prefix,
          description: templateData.description ?? '',
          category: templateData.category ?? '',
          icon: templateData.icon ?? '',
        },
      });
    }
  }, [templateData, dispatch]);

  // Save mutation
  const updateMutation = useUpdateTemplate();

  const handleSave = useCallback(async () => {
    const schema: SchemaDefinition = {
      version: state.schemaVersion,
      fields: state.fields,
      conditionalRules: [],
      calculationRules: [],
    };
    try {
      await updateMutation.mutateAsync({
        id: templateId,
        data: {
          name: state.templateSettings.name,
          description: state.templateSettings.description || undefined,
          category: state.templateSettings.category || undefined,
          icon: state.templateSettings.icon || undefined,
          schemaDefinition: schema,
        },
      });
      dispatch({ type: 'MARK_SAVED' });
      window.alert(t('templates.saved'));
    } catch {
      window.alert(t('templates.saveError'));
    }
  }, [state, templateId, updateMutation, dispatch, t]);

  // Drag and drop handler
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination) return;

      if (
        source.droppableId === 'palette' &&
        destination.droppableId === 'canvas'
      ) {
        const fieldType = PALETTE_ITEMS[source.index].type;
        dispatch({
          type: 'ADD_FIELD',
          fieldType,
          insertIndex: destination.index,
        });
      } else if (
        source.droppableId === 'canvas' &&
        destination.droppableId === 'canvas'
      ) {
        if (source.index === destination.index) return;
        dispatch({
          type: 'REORDER_FIELD',
          fromIndex: source.index,
          toIndex: destination.index,
        });
      }
    },
    [dispatch],
  );

  // Click-to-append handler
  const handleClickAdd = useCallback(
    (fieldType: FieldType) => {
      dispatch({
        type: 'ADD_FIELD',
        fieldType,
        insertIndex: state.fields.length,
      });
    },
    [dispatch, state.fields.length],
  );

  // JSON export handler
  const handleJsonExport = useCallback(() => {
    const schema: SchemaDefinition = {
      version: state.schemaVersion,
      fields: state.fields,
      conditionalRules: [],
      calculationRules: [],
    };
    const blob = new Blob([JSON.stringify(schema, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.templateSettings.prefix || 'template'}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // Unsaved changes warning (beforeunload)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.isDirty]);

  // Back navigation with unsaved warning
  const handleBack = useCallback(() => {
    if (state.isDirty && !window.confirm(t('templates.unsavedWarning'))) return;
    navigate('/admin/templates');
  }, [state.isDirty, navigate, t]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <BuilderLayout
        toolbar={
          <BuilderToolbar
            templateName={state.templateSettings.name}
            isDirty={state.isDirty}
            isPreview={isPreview}
            isSaving={updateMutation.isPending}
            onTogglePreview={() => setIsPreview((p) => !p)}
            onSave={handleSave}
            onBack={handleBack}
            onJsonImport={() => {
              /* JSON import modal - Plan 04 */
            }}
            onJsonExport={handleJsonExport}
          />
        }
        palette={
          <div className={isPreview ? 'opacity-60 pointer-events-none' : ''}>
            <FieldPalette onClickAdd={handleClickAdd} />
          </div>
        }
        canvas={
          isPreview ? (
            <BuilderPreview
              fields={state.fields}
              schemaVersion={state.schemaVersion}
              templateCode={state.templateSettings.prefix}
            />
          ) : (
            <BuilderCanvas
              fields={state.fields}
              selectedFieldId={state.selectedFieldId}
              onSelect={(fieldId) =>
                dispatch({ type: 'SELECT_FIELD', fieldId })
              }
              onDuplicate={(fieldId) =>
                dispatch({ type: 'DUPLICATE_FIELD', fieldId })
              }
              onDelete={(fieldId) =>
                dispatch({ type: 'REMOVE_FIELD', fieldId })
              }
            />
          )
        }
        propertyPanel={
          <div
            className={`p-4 text-sm text-gray-400 ${isPreview ? 'opacity-60 pointer-events-none' : ''}`}
          >
            {t('templates.noFieldSelected')}
          </div>
        }
      />
    </DragDropContext>
  );
}
