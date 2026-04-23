import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useApprove, useReject } from '../useApprovals';

// approvalApi mock — 즉시 resolve 하여 onSuccess 실행 경로만 검증
vi.mock('../../api/approvalApi', () => ({
  approvalApi: {
    approve: vi.fn().mockResolvedValue({ data: { data: { id: 1 } } }),
    reject: vi.fn().mockResolvedValue({ data: { data: null } }),
  },
}));

describe('useApprovals mutation onSuccess — Phase 31 D-B3 invalidate 검증', () => {
  let queryClient: QueryClient;
  // vi.spyOn 의 반환 타입 — mock 함수로 간주 가능
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // QueryClient 인스턴스의 invalidateQueries 를 스파이 — 호출 여부 / 인자 검증
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('useApprove onSuccess 가 approvals/documents/dashboard 3 prefix invalidate', async () => {
    const { result } = renderHook(() => useApprove(), { wrapper });
    result.current.mutate({ lineId: 1, comment: undefined });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['approvals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('useReject onSuccess 가 approvals/documents/dashboard 3 prefix invalidate', async () => {
    const { result } = renderHook(() => useReject(), { wrapper });
    result.current.mutate({ lineId: 1, comment: 'reject reason' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['approvals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});
