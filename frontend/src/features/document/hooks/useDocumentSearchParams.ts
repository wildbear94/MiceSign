import { useSearchParams } from 'react-router';
import type { SearchTab } from '../types/document';

export interface DocumentSearchState {
  tab: SearchTab;
  keyword: string;
  status: string;
  templateCode: string;
  startDate: string;
  endDate: string;
  page: number;
}

export function useDocumentSearchParams(): [DocumentSearchState, (updates: Partial<DocumentSearchState>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: DocumentSearchState = {
    tab: (searchParams.get('tab') as SearchTab) || 'MY',
    keyword: searchParams.get('keyword') || '',
    status: searchParams.get('status') || '',
    templateCode: searchParams.get('templateCode') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    page: Number(searchParams.get('page')) || 0,
  };

  const updateState = (updates: Partial<DocumentSearchState>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === undefined || value === null || (key === 'page' && value === 0)) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    }
    // Reset page when filters change (per Pitfall 3)
    if (!('page' in updates)) {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  };

  return [state, updateState];
}
