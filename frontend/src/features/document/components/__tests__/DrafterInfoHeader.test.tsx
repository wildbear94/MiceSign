import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrafterInfoHeader from '../DrafterInfoHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('DrafterInfoHeader', () => {
  it('mode=draft — 부서/직위·직책/기안자 표시 + 기안일 = 플레이스홀더', () => {
    render(
      <DrafterInfoHeader
        mode="draft"
        live={{ drafterName: '홍길동', departmentName: '개발1팀', positionName: '팀장' }}
      />,
    );
    expect(screen.getByText('개발1팀')).toBeInTheDocument();
    expect(screen.getByText('팀장')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('drafterInfo.draftedAtPlaceholder')).toBeInTheDocument();
    expect(screen.queryByText('drafterInfo.currentInfoBadge')).not.toBeInTheDocument();
  });

  it('mode=submitted + snapshot 존재 — snapshot 4 필드 표시, 배지 없음', () => {
    render(
      <DrafterInfoHeader
        mode="submitted"
        snapshot={{
          departmentName: '경영지원팀',
          positionName: '대리',
          drafterName: '김철수',
          draftedAt: '2026-04-29T10:30:00',
        }}
        live={{ drafterName: 'IGNORED', departmentName: 'IGNORED', positionName: null }}
        submittedAt="2026-04-29T10:30:00"
      />,
    );
    expect(screen.getByText('경영지원팀')).toBeInTheDocument();
    expect(screen.getByText('대리')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.queryByText('drafterInfo.currentInfoBadge')).not.toBeInTheDocument();
    // Date format assertion — toLocaleDateString('ko-KR', y/m/d) → "2026. 04. 29."
    expect(screen.getByText(/2026\. 04\. 29\./)).toBeInTheDocument();
  });

  it('mode=submitted + snapshot=null (legacy) — live 4 필드 + (현재 정보) 배지', () => {
    render(
      <DrafterInfoHeader
        mode="submitted"
        snapshot={null}
        live={{ drafterName: '이영희', departmentName: '인사팀', positionName: null }}
        submittedAt="2026-04-29T10:30:00"
      />,
    );
    expect(screen.getByText('인사팀')).toBeInTheDocument();
    expect(screen.getByText('drafterInfo.emptyPosition')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
    expect(screen.getByText('drafterInfo.currentInfoBadge')).toBeInTheDocument();
    expect(screen.getByText(/2026\. 04\. 29\./)).toBeInTheDocument();
  });
});
