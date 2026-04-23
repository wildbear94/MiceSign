import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrafterCombo } from '../DrafterCombo';
import { userSearchApi } from '../../api/userSearchApi';

vi.mock('../../api/userSearchApi', () => ({
  userSearchApi: {
    search: vi.fn(),
  },
}));

describe('DrafterCombo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('2자 미만 입력 시 API 호출 안 함', async () => {
    const onChange = vi.fn();
    render(<DrafterCombo value={null} onChange={onChange} />);
    const input = screen.getByPlaceholderText('기안자 이름');
    await userEvent.type(input, '김');
    await new Promise((r) => setTimeout(r, 400));
    expect(userSearchApi.search).not.toHaveBeenCalled();
  });

  it('2자 이상 입력 + 300ms 대기 시 API 호출', async () => {
    (userSearchApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [{ id: 1, name: '김철수', departmentName: '개발팀' }] },
    });
    const onChange = vi.fn();
    render(<DrafterCombo value={null} onChange={onChange} />);
    const input = screen.getByPlaceholderText('기안자 이름');
    await userEvent.type(input, '김철');
    await waitFor(
      () => expect(userSearchApi.search).toHaveBeenCalledWith('김철', 20),
      { timeout: 1000 },
    );
  });

  it('후보 클릭 시 onChange(id, name) 호출', async () => {
    (userSearchApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [{ id: 42, name: '김철수', departmentName: '개발팀' }] },
    });
    const onChange = vi.fn();
    render(<DrafterCombo value={null} onChange={onChange} />);
    const input = screen.getByPlaceholderText('기안자 이름');
    await userEvent.type(input, '김철');
    const candidate = await screen.findByText('김철수', {}, { timeout: 1000 });
    fireEvent.mouseDown(candidate);
    expect(onChange).toHaveBeenCalledWith(42, '김철수');
  });

  it('× 버튼 클릭 시 onChange(null) 호출', async () => {
    (userSearchApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: [{ id: 42, name: '김철수', departmentName: '개발팀' }] },
    });
    const onChange = vi.fn();
    const { rerender } = render(<DrafterCombo value={null} onChange={onChange} />);
    rerender(<DrafterCombo value="42" onChange={onChange} />);
    const clearBtn = await screen.findByLabelText('기안자 선택 해제');
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
