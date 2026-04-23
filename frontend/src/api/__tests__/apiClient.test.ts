import { describe, it, expect } from 'vitest';
import { serializeParams } from '../client';

describe('apiClient paramsSerializer (Plan 30-04)', () => {
  describe('단일 값', () => {
    it('문자열 값을 key=value 로 직렬화', () => {
      expect(serializeParams({ keyword: 'foo' })).toBe('keyword=foo');
    });

    it('한글 값을 URL 인코딩', () => {
      expect(serializeParams({ keyword: '경비' })).toBe('keyword=%EA%B2%BD%EB%B9%84');
    });

    it('number 값을 String 으로 변환 (0 포함)', () => {
      expect(serializeParams({ page: 0, size: 20 })).toBe('page=0&size=20');
    });

    it('drafterId number 을 변환', () => {
      expect(serializeParams({ drafterId: 42 })).toBe('drafterId=42');
    });
  });

  describe('배열 값 (repeat 포맷)', () => {
    it('배열을 key=a&key=b 로 직렬화 (brackets 아님)', () => {
      expect(serializeParams({ status: ['SUBMITTED', 'APPROVED'] }))
        .toBe('status=SUBMITTED&status=APPROVED');
    });

    it('단일 요소 배열도 repeat 포맷 유지', () => {
      expect(serializeParams({ status: ['SUBMITTED'] })).toBe('status=SUBMITTED');
    });
  });

  describe('null / undefined / 빈 문자열 (Pitfall 3 호환성)', () => {
    it('null 값 제거', () => {
      expect(serializeParams({ keyword: null, status: 'A' })).toBe('status=A');
    });

    it('undefined 값 제거', () => {
      expect(serializeParams({ keyword: undefined, status: 'A' })).toBe('status=A');
    });

    it('빈 문자열 값 제거', () => {
      expect(serializeParams({ keyword: '', status: 'A' })).toBe('status=A');
    });

    it('배열 내 null/undefined/빈 문자열 제거', () => {
      expect(serializeParams({ status: ['A', null, '', undefined, 'B'] as unknown[] }))
        .toBe('status=A&status=B');
    });
  });

  describe('복합 파라미터', () => {
    it('/documents/search 실제 파라미터 형태', () => {
      const result = serializeParams({
        keyword: '경비',
        status: ['SUBMITTED', 'APPROVED'],
        templateCode: 'EXPENSE',
        drafterId: 42,
        page: 2,
        size: 20,
        tab: 'all',
      });
      expect(result).toContain('status=SUBMITTED');
      expect(result).toContain('status=APPROVED');
      expect(result).toContain('drafterId=42');
      expect(result).toContain('page=2');
      expect(result).toContain('tab=all');
      expect(result).toContain('%EA%B2%BD%EB%B9%84'); // '경비'
    });
  });
});
