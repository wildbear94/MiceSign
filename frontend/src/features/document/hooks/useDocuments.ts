import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MyDocumentParams,
} from '../types/document';

export function useMyDocuments(params: MyDocumentParams) {
  return useQuery({
    queryKey: ['documents', 'my', params],
    queryFn: () => documentApi.getMyDocuments(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
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
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.withdraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
    },
  });
}

export function useRewrite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => documentApi.rewrite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
    },
  });
}
