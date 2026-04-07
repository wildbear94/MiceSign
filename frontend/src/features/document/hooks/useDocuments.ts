import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentSearchParams,
} from '../types/document';

export function useDocument(id: number | null) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentApi.getById(id!),
    enabled: id !== null,
  });
}

export function useSearchDocuments(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['documents', 'search', params],
    queryFn: () => documentApi.search(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateDocumentRequest) => documentApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateDocumentRequest }) =>
      documentApi.update(id, req),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useSubmitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useWithdrawDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.withdraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRewriteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.rewrite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
