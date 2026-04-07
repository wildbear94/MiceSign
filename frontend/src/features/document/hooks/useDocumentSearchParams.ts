import { useSearchParams } from 'react-router';
import { useCallback, useMemo } from 'react';
import type { DocumentSearchParams, DocumentStatus } from '../types/document';

type SearchTab = 'my' | 'department' | 'all';

export interface DocumentSearchState {
  tab: SearchTab;
  keyword: string;
  status: DocumentStatus | '';
  templateCode: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  size: number;
}

type UpdateFn = (updates: Partial<DocumentSearchState>) => void;

export function useDocumentSearchParams(): [DocumentSearchState, UpdateFn] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo<DocumentSearchState>(() => ({
    tab: (searchParams.get('tab') as SearchTab) || 'my',
    keyword: searchParams.get('keyword') || '',
    status: (searchParams.get('status') as DocumentStatus | '') || '',
    templateCode: searchParams.get('templateCode') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    page: Number(searchParams.get('page')) || 0,
    size: Number(searchParams.get('size')) || 20,
  }), [searchParams]);

  const update = useCallback<UpdateFn>((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value === '' || value === undefined || value === null) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      // Reset page to 0 when filters change (unless page itself is being set)
      if (!('page' in updates)) {
        next.delete('page');
      }
      return next;
    });
  }, [setSearchParams]);

  return [state, update];
}

/** Convert search state to API params */
export function toSearchParams(state: DocumentSearchState): DocumentSearchParams {
  return {
    ...(state.keyword && { keyword: state.keyword }),
    ...(state.status && { status: state.status as DocumentStatus }),
    ...(state.templateCode && { templateCode: state.templateCode }),
    ...(state.dateFrom && { dateFrom: state.dateFrom }),
    ...(state.dateTo && { dateTo: state.dateTo }),
    tab: state.tab,
    page: state.page,
    size: state.size,
  };
}
