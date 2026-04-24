import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MyDocumentParams,
  DocumentSearchParams,
} from '../types/document';

export function useMyDocuments(params: MyDocumentParams) {
  return useQuery({
    queryKey: ['documents', 'my', params],
    queryFn: () => documentApi.getMyDocuments(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
  });
}

export function useSearchDocuments(params: DocumentSearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ['documents', 'search', params],
    queryFn: () => documentApi.searchDocuments(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useDocumentDetail(id: number | null) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentApi.getById(id!).then((res) => res.data.data!),
    enabled: id !== null,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentRequest) =>
      documentApi.create(data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentRequest }) =>
      documentApi.update(id, data).then((res) => res.data.data!),
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
    mutationFn: (id: number) =>
      documentApi.submit(id).then((res) => res.data.data!),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });  // Phase 31 D-B3
    },
  });
}

export function useWithdrawDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      documentApi.withdraw(id).then((res) => res.data.data!),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });  // Phase 31 D-B3
    },
  });
}

export function useRewriteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      documentApi.rewrite(id).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
