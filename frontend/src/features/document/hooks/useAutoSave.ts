import { useEffect, useRef, useCallback, useState } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(
  saveFn: () => Promise<void>,
  dependencies: unknown[],
  delayMs = 30000
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isSaving = useRef(false);
  const isFirstRender = useRef(true);

  const executeSave = useCallback(async () => {
    if (isSaving.current) return;
    isSaving.current = true;
    setStatus('saving');
    try {
      await saveFn();
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      isSaving.current = false;
    }
  }, [saveFn]);

  const triggerSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(executeSave, delayMs);
  }, [executeSave, delayMs]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await executeSave();
  }, [executeSave]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerSave();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, saveNow, triggerSave };
}

export type { SaveStatus };
