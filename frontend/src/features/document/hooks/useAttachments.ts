import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentApi } from '../api/attachmentApi';

export function useAttachments(documentId: number | undefined) {
  return useQuery({
    queryKey: ['attachments', documentId],
    queryFn: () => attachmentApi.getByDocumentId(documentId!),
    enabled: !!documentId,
  });
}

export function useDeleteAttachment(documentId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => attachmentApi.delete(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', documentId] });
    },
  });
}
