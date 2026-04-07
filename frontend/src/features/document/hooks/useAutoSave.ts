import { useEffect, useRef, useCallback, useState } from 'react';
import { useUpdateDocument } from './useDocuments';
import type { UpdateDocumentRequest } from '../types/document';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(
  docId: number | null,
  getData: () => UpdateDocumentRequest | null,
  interval = 30000,
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const updateMutation = useUpdateDocument();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isSaving = useRef(false);
  const isFirstRender = useRef(true);

  const executeSave = useCallback(async () => {
    if (!docId || isSaving.current) return;
    const data = getData();
    if (!data) return;

    isSaving.current = true;
    setStatus('saving');
    try {
      await updateMutation.mutateAsync({ id: docId, req: data });
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      isSaving.current = false;
    }
  }, [docId, getData, updateMutation]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await executeSave();
  }, [executeSave]);

  const triggerSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(executeSave, interval);
  }, [executeSave, interval]);

  // Start auto-save timer after first render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!docId) return;

    triggerSave();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [docId, triggerSave]);

  return { status, saveNow, triggerSave };
}
