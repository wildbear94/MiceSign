import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentApi } from '../api/attachmentApi';

export function useUploadAttachment(docId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      attachmentApi.upload(docId, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', docId] });
    },
  });
}

export async function downloadAttachment(attachmentId: number) {
  const { blob, filename } = await attachmentApi.download(attachmentId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useDeleteAttachment(docId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => attachmentApi.delete(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', docId] });
    },
  });
}
