import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentListPage from '../DocumentListPage';

// Mock react-i18next — return keys as-is (no real translation needed)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

// Mock document hooks — isolate URL sync behavior
vi.mock('../../hooks/useDocuments', () => ({
  useMyDocuments: () => ({
    data: { content: [], totalElements: 0, totalPages: 0, number: 0 },
    isLoading: false,
  }),
  useSearchDocuments: () => ({
    data: { content: [], totalElements: 0, totalPages: 0, number: 0 },
    isLoading: false,
  }),
}));

vi.mock('../../api/userSearchApi', () => ({
  userSearchApi: { search: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

// URL 실제 업데이트 검증 helper (Revision 1 WARNING 3)
const LocationDisplay = () => {
  const { search } = useLocation();
  return <div data-testid="location">{search}</div>;
};

const renderWithRouter = (initialEntries: string[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route
            path="/documents"
            element={
              <>
                <DocumentListPage />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('DocumentListPage — URL ↔ 필터 동기화 (SRCH-05, I5 invariant)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('URL 에 필터 포함 시 UI 반영 (I5)', async () => {
    renderWithRouter([
      '/documents?tab=search&keyword=경비&status=SUBMITTED&status=APPROVED&drafterId=42&page=2',
    ]);
    // 키워드 input value 반영
    const keywordInput = (await screen.findByPlaceholderText('search.placeholder')) as HTMLInputElement;
    expect(keywordInput.value).toBe('경비');
    // SUBMITTED pill aria-pressed
    const submittedPill = screen.getByRole('button', { name: /결재 대기|SUBMITTED/i });
    expect(submittedPill.getAttribute('aria-pressed')).toBe('true');
  });

  it('키워드 입력 + 300ms debounce 후 URL 반영 + page reset (I5)', async () => {
    renderWithRouter(['/documents?tab=search&page=5']);
    const keywordInput = await screen.findByPlaceholderText('search.placeholder');
    await userEvent.type(keywordInput, '보고서');
    await waitFor(
      () => {
        const location = screen.getByTestId('location').textContent ?? '';
        expect(location).toContain('keyword=%EB%B3%B4%EA%B3%A0%EC%84%9C');
        expect(location).not.toContain('page=5');
      },
      { timeout: 1500 },
    );
    expect((keywordInput as HTMLInputElement).value).toBe('보고서');
  });

  it('빈 keyword 입력 시 URL 에서 keyword 삭제 (D-C4)', async () => {
    renderWithRouter(['/documents?tab=search&keyword=초기값']);
    const keywordInput = (await screen.findByPlaceholderText('search.placeholder')) as HTMLInputElement;
    expect(keywordInput.value).toBe('초기값');
    await userEvent.clear(keywordInput);
    await waitFor(
      () => {
        const location = screen.getByTestId('location').textContent ?? '';
        expect(location).not.toContain('keyword=');
      },
      { timeout: 1500 },
    );
    expect(keywordInput.value).toBe('');
  });

  it('복수 status pills 토글 동작', async () => {
    renderWithRouter(['/documents?tab=search']);
    const submittedPill = await screen.findByRole('button', { name: /결재 대기|SUBMITTED/i });
    expect(submittedPill.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(submittedPill);
    await waitFor(() => expect(submittedPill.getAttribute('aria-pressed')).toBe('true'));
    await userEvent.click(submittedPill);
    await waitFor(() => expect(submittedPill.getAttribute('aria-pressed')).toBe('false'));
  });

  it('tab=my 진입 시 DrafterCombo 와 복수 상태 pills 숨김', async () => {
    renderWithRouter(['/documents?tab=my']);
    await waitFor(() => expect(screen.queryByPlaceholderText('기안자 이름')).toBeNull());
  });

  it('tab=search 진입 시 DrafterCombo 노출', async () => {
    renderWithRouter(['/documents?tab=search']);
    await waitFor(() => expect(screen.getByPlaceholderText('기안자 이름')).toBeTruthy());
  });
});
