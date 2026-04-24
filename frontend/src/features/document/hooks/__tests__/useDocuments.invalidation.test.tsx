import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSubmitDocument,
  useWithdrawDocument,
  useCreateDocument,
} from '../useDocuments';
import type { CreateDocumentRequest } from '../../types/document';

// documentApi mock — 즉시 resolve 하여 onSuccess 경로만 검증
vi.mock('../../api/documentApi', () => ({
  documentApi: {
    submit: vi.fn().mockResolvedValue({ data: { data: { id: 1 } } }),
    withdraw: vi.fn().mockResolvedValue({ data: { data: { id: 1 } } }),
    create: vi.fn().mockResolvedValue({ data: { data: { id: 1 } } }),
  },
}));

describe('useDocuments mutation onSuccess — Phase 31 D-B3 invalidate 검증', () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useSubmitDocument onSuccess 가 documents/documents-id/dashboard 3 invalidate', async () => {
    const { result } = renderHook(() => useSubmitDocument(), { wrapper });
    result.current.mutate(42);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents', 42] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('useWithdrawDocument onSuccess 가 documents/documents-id/approvals/dashboard 4 invalidate', async () => {
    const { result } = renderHook(() => useWithdrawDocument(), { wrapper });
    result.current.mutate(42);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents', 42] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['approvals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('useCreateDocument onSuccess 는 dashboard invalidate 하지 않음 (D-B3 scope 경계)', async () => {
    const { result } = renderHook(() => useCreateDocument(), { wrapper });
    const req: CreateDocumentRequest = {
      templateCode: 'GENERAL',
      title: 'test',
      bodyHtml: null,
      formData: null,
      approvalLines: null,
    };
    result.current.mutate(req);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});
