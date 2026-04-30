import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RowPositionSelector from '../RowPositionSelector';

// Identity i18n mock — keys with {{number}} interpolation return `key:number` so we can
// match buttons like "rowButton:1" / "rowButton:2" (matches DrafterInfoHeader.test.tsx pattern).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { number?: number }) =>
      opts && typeof opts.number === 'number' ? `${key}:${opts.number}` : key,
  }),
}));

// Capture toast calls — sonner mock
const toastMock = vi.fn();
vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

describe('RowPositionSelector', () => {
  it('case 1: value=null → 단독 selected; 행 1 / + 새 행 enabled', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={null}
        onChange={onChange}
        currentRowOccupancy={{ 1: 1 }}
        ownCurrentRowGroup={null}
      />,
    );

    const single = screen.getByRole('button', { name: /templates\.rowLayout\.singleButton/ });
    expect(single).toHaveAttribute('aria-pressed', 'true');

    const row1 = screen.getByRole('button', { name: /rowButton:1/ });
    expect(row1).not.toBeDisabled();

    const newRow = screen.getByRole('button', {
      name: /templates\.rowLayout\.newRowButton/,
    });
    expect(newRow).not.toBeDisabled();
  });

  it('case 2: value=1, occupancy={1:1} → 행 1 selected', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={1}
        onChange={onChange}
        currentRowOccupancy={{ 1: 1 }}
        ownCurrentRowGroup={1}
      />,
    );

    const row1 = screen.getByRole('button', { name: /rowButton:1/ });
    expect(row1).toHaveAttribute('aria-pressed', 'true');
  });

  it('case 3: value=null, occupancy={1:3} → 행 1 disabled with rowFullTooltip title', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={null}
        onChange={onChange}
        currentRowOccupancy={{ 1: 3 }}
        ownCurrentRowGroup={null}
      />,
    );

    const row1 = screen.getByRole('button', { name: /rowButton:1/ });
    expect(row1).toBeDisabled();
    expect(row1).toHaveAttribute('aria-disabled', 'true');
    expect(row1).toHaveAttribute('title', 'templates.rowLayout.rowFullTooltip');
  });

  it('case 4: value=2, occupancy={1:3, 2:2} → 행 1 disabled (own field not in row 1), 행 2 selected', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={2}
        onChange={onChange}
        currentRowOccupancy={{ 1: 3, 2: 2 }}
        ownCurrentRowGroup={2}
      />,
    );

    const row1 = screen.getByRole('button', { name: /rowButton:1/ });
    expect(row1).toBeDisabled();
    expect(row1).toHaveAttribute('aria-disabled', 'true');

    const row2 = screen.getByRole('button', { name: /rowButton:2/ });
    expect(row2).toHaveAttribute('aria-pressed', 'true');
    expect(row2).not.toBeDisabled();
  });

  it('case 5: clicking 단독 → onChange(null)', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={1}
        onChange={onChange}
        currentRowOccupancy={{ 1: 1 }}
        ownCurrentRowGroup={1}
      />,
    );

    const single = screen.getByRole('button', { name: /templates\.rowLayout\.singleButton/ });
    fireEvent.click(single);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('case 6: clicking 행 2 → onChange(2)', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={null}
        onChange={onChange}
        currentRowOccupancy={{ 1: 1, 2: 1 }}
        ownCurrentRowGroup={null}
      />,
    );

    const row2 = screen.getByRole('button', { name: /rowButton:2/ });
    fireEvent.click(row2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('case 7: clicking + 새 행 → onChange(maxRowGroup + 1)', () => {
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={null}
        onChange={onChange}
        currentRowOccupancy={{ 1: 1, 2: 1 }}
        ownCurrentRowGroup={null}
      />,
    );

    const newRow = screen.getByRole('button', {
      name: /templates\.rowLayout\.newRowButton/,
    });
    fireEvent.click(newRow);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('case 8: clicking disabled 행 1 → onChange NOT called', () => {
    // Note: native `disabled` attr suppresses synthetic click in jsdom, so the toast
    // branch handler is exercised by handler logic but may not necessarily fire in this
    // jsdom path. The critical contract here is that onChange is NOT called.
    const onChange = vi.fn();
    render(
      <RowPositionSelector
        value={null}
        onChange={onChange}
        currentRowOccupancy={{ 1: 3 }}
        ownCurrentRowGroup={null}
      />,
    );

    const row1 = screen.getByRole('button', { name: /rowButton:1/ });
    fireEvent.click(row1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
