import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorState from '../ErrorState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        error: '일시적인 오류가 발생했습니다',
        errorDesc: '잠시 후 다시 시도해 주세요.',
        retry: '다시 시도',
      };
      return map[k] ?? k;
    },
  }),
}));

function renderWithQC(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, 'refetchQueries').mockResolvedValue(undefined);
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return spy;
}

describe('ErrorState — Phase 31 D-C2', () => {
  it('list variant 는 heading + body + 다시 시도 버튼 렌더', () => {
    renderWithQC(<ErrorState variant="list" />);
    expect(screen.getByText('일시적인 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText('잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('card variant 는 body 를 생략', () => {
    renderWithQC(<ErrorState variant="card" />);
    expect(screen.getByText('일시적인 오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.queryByText('잠시 후 다시 시도해 주세요.')).not.toBeInTheDocument();
  });

  it("다시 시도 클릭 시 refetchQueries({queryKey:['dashboard']}) 호출", () => {
    const spy = renderWithQC(<ErrorState variant="list" />);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });
});
