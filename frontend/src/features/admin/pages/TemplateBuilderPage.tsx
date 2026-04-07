import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Loader2 } from 'lucide-react';
import {
  useAdminTemplate,
  useUpdateTemplate,
} from '../hooks/useAdminTemplates';
import type { UpdateTemplateRequest } from '../types/builder';
import type { FieldDefinition } from '../../document/types/dynamicForm';
import { useBuilderReducer, createField } from '../components/builder/useBuilderReducer';
import BuilderLayout from '../components/builder/BuilderLayout';
import BuilderToolbar from '../components/builder/BuilderToolbar';
import BuilderCanvas from '../components/builder/BuilderCanvas';
import FieldPalette from '../components/builder/FieldPalette';
import PropertyPanel from '../components/builder/PropertyPanel';
import JsonImportModal from '../components/builder/JsonImportModal';

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const templateId = id ? Number(id) : null;
  const navigate = useNavigate();

  const { data: template, isLoading, isError } = useAdminTemplate(templateId);
  const updateMutation = useUpdateTemplate();

  const [state, dispatch] = useBuilderReducer();
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize from loaded template (only once)
  useEffect(() => {
    if (!template || initialized) return;

    const raw = template.schemaDefinition;
    if (raw) {
      try {
        const schema = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (schema && Array.isArray(schema.fields)) {
          dispatch({ type: 'LOAD_SCHEMA', fields: schema.fields });
        }
      } catch {
        // Invalid schema JSON, start with empty canvas
      }
    }
    setInitialized(true);
  }, [template, initialized, dispatch]);

  // Unsaved changes warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (state.isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  // Save handler
  const handleSave = useCallback(
    (schemaJson: string) => {
      if (templateId === null || !template) return;

      const fields: FieldDefinition[] = JSON.parse(schemaJson).fields;

      const req: UpdateTemplateRequest = {
        name: template.name,
        description: template.description ?? undefined,
        category: template.category ?? undefined,
        icon: template.icon ?? undefined,
        schemaDefinition: {
          version: (template.schemaVersion ?? 0) + 1,
          fields,
          conditionalRules: [],
          calculationRules: [],
        },
      };

      updateMutation.mutate(
        { id: templateId, req },
        {
          onSuccess: () => {
            dispatch({ type: 'MARK_SAVED' });
          },
        },
      );
    },
    [templateId, template, updateMutation, dispatch],
  );

  // Back navigation with dirty check
  const handleBack = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm(
        '저장되지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?',
      );
      if (!confirmed) return;
    }
    navigate('/admin/templates');
  }, [state.isDirty, navigate]);

  // JSON export
  const handleJsonExport = useCallback(() => {
    const schema = { fields: state.fields };
    const blob = new Blob([JSON.stringify(schema, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template?.code ?? 'schema'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.fields, template?.code]);

  // JSON import
  const handleJsonImport = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json);
        const fields = parsed.fields ?? [];
        dispatch({ type: 'LOAD_SCHEMA', fields });
        // Mark dirty since imported schema differs from saved
        if (fields.length > 0) {
          // Add and immediately remove a dummy field to set isDirty
          const dummy = createField('text');
          dispatch({ type: 'ADD_FIELD', field: dummy });
          dispatch({ type: 'REMOVE_FIELD', fieldId: dummy.id });
        }
        setShowJsonImport(false);
      } catch {
        alert('JSON 파싱에 실패했습니다. 올바른 형식인지 확인해주세요.');
      }
    },
    [dispatch],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Error / Not found
  if (isError || !template) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
            양식을 찾을 수 없습니다
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            요청한 양식이 존재하지 않거나 접근 권한이 없습니다.
          </p>
          <button
            type="button"
            onClick={() => navigate('/admin/templates')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BuilderLayout
        state={state}
        dispatch={dispatch}
        templateName={template.name}
        onSave={handleSave}
      />

      {/* JSON Import Modal */}
      {showJsonImport && (
        <JsonImportModal
          isOpen={showJsonImport}
          onClose={() => setShowJsonImport(false)}
          onImport={handleJsonImport}
        />
      )}
    </>
  );
}
