import { useState, useEffect, useRef, useCallback } from 'react';
import { attachmentApi } from '../../api/attachmentApi';
import { validateFile } from './fileValidation';
import type { AttachmentResponse, FileUploadItem } from '../../types/document';

interface UseFileUploadOptions {
  documentId: number;
  existingAttachments: AttachmentResponse[];
  onUploadComplete: () => void;
}

interface UseFileUploadReturn {
  uploadItems: FileUploadItem[];
  addFiles: (files: File[]) => void;
  cancelUpload: (clientId: string) => void;
  validationError: string | null;
  clearError: () => void;
}

export function useFileUpload({
  documentId,
  existingAttachments,
  onUploadComplete,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const isProcessing = useRef(false);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear error after 5 seconds
  useEffect(() => {
    if (validationError) {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setValidationError(null), 5000);
    }
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [validationError]);

  const clearError = useCallback(() => {
    setValidationError(null);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  // Add files with validation
  const addFiles = useCallback(
    (files: File[]) => {
      const activeUploads = uploadItems.filter(
        (item) => item.status !== 'error',
      );
      let currentCount = existingAttachments.length + activeUploads.length;
      let currentTotalSize =
        existingAttachments.reduce((sum, a) => sum + a.fileSize, 0) +
        activeUploads.reduce((sum, item) => sum + item.file.size, 0);

      const newItems: FileUploadItem[] = [];

      for (const file of files) {
        const error = validateFile(file, currentCount, currentTotalSize);
        if (error) {
          setValidationError(error);
          continue;
        }
        const item: FileUploadItem = {
          id: crypto.randomUUID(),
          file,
          status: 'pending',
          progress: 0,
        };
        newItems.push(item);
        currentCount++;
        currentTotalSize += file.size;
      }

      if (newItems.length > 0) {
        setUploadItems((prev) => [...prev, ...newItems]);
      }
    },
    [existingAttachments, uploadItems],
  );

  // Cancel an upload
  const cancelUpload = useCallback((clientId: string) => {
    const controller = abortControllers.current.get(clientId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(clientId);
    }
    setUploadItems((prev) => prev.filter((item) => item.id !== clientId));
  }, []);

  // Process upload queue sequentially
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing.current) return;

      const pendingItem = uploadItems.find((item) => item.status === 'pending');
      if (!pendingItem) return;

      isProcessing.current = true;

      // Mark as uploading
      setUploadItems((prev) =>
        prev.map((item) =>
          item.id === pendingItem.id ? { ...item, status: 'uploading' as const } : item,
        ),
      );

      const controller = new AbortController();
      abortControllers.current.set(pendingItem.id, controller);

      try {
        const attachments = await attachmentApi.upload(
          documentId,
          pendingItem.file,
          (percent) => {
            setUploadItems((prev) =>
              prev.map((item) =>
                item.id === pendingItem.id ? { ...item, progress: percent } : item,
              ),
            );
          },
          controller.signal,
        );

        // Mark as complete
        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === pendingItem.id
              ? { ...item, status: 'complete' as const, progress: 100, attachment: attachments[0] }
              : item,
          ),
        );

        abortControllers.current.delete(pendingItem.id);
        onUploadComplete();

        // Remove completed item after 2 seconds
        setTimeout(() => {
          setUploadItems((prev) => prev.filter((item) => item.id !== pendingItem.id));
        }, 2000);
      } catch (err) {
        // Ignore aborted requests (user cancelled)
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        setUploadItems((prev) =>
          prev.map((item) =>
            item.id === pendingItem.id
              ? { ...item, status: 'error' as const, error: '파일 업로드에 실패했습니다.' }
              : item,
          ),
        );
        abortControllers.current.delete(pendingItem.id);
      } finally {
        isProcessing.current = false;
      }
    };

    processQueue();
  }, [uploadItems, documentId, onUploadComplete]);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllers.current.forEach((controller) => controller.abort());
      abortControllers.current.clear();
    };
  }, []);

  return { uploadItems, addFiles, cancelUpload, validationError, clearError };
}
