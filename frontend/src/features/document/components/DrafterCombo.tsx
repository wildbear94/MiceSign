import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { userSearchApi, type UserSearchItem } from '../api/userSearchApi';

export interface DrafterComboProps {
  value: string | null; // URL searchParams value (string id) — caller responsible for Number() conversion
  onChange: (id: number | null, displayName?: string) => void;
  placeholder?: string;
  className?: string;
}

export function DrafterCombo({ value, onChange, placeholder = '기안자 이름', className }: DrafterComboProps) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<UserSearchItem[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // When URL value changes externally (link share, back/forward), fetch the user's display name.
  // displayName 을 deps 에 넣으면 setDisplayName → re-run loop 발생 — 의도적 제외.
  useEffect(() => {
    if (value && !displayName) {
      userSearchApi
        .search(value.toString(), 1)
        .then((r) => {
          const users = r.data.data ?? [];
          const match = users.find((u) => String(u.id) === value);
          if (match) setDisplayName(match.name);
        })
        .catch(() => {
          /* silent — fallback: show raw id until next load */
        });
    }
    if (!value) setDisplayName('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Debounced search — 300ms + 2자 이상 가드 (T-30-04 축소)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      userSearchApi
        .search(query, 20)
        .then((r) => {
          setCandidates(r.data.data ?? []);
          setIsOpen(true);
        })
        .catch(() => setCandidates([]));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (user: UserSearchItem) => {
    onChange(user.id, user.name);
    setDisplayName(user.name);
    setQuery('');
    setCandidates([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setDisplayName('');
    setQuery('');
    setCandidates([]);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="flex items-center border border-gray-300 rounded-md h-9 px-3">
        <input
          value={value ? displayName : query}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (candidates.length > 0) setIsOpen(true);
          }}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder={placeholder}
          className="flex-1 outline-none text-sm bg-transparent"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="기안자 선택 해제"
            className="ml-1 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {isOpen && candidates.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-md max-h-60 overflow-y-auto">
          {candidates.map((u) => (
            <li
              key={u.id}
              onMouseDown={() => handleSelect(u)}
              className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
            >
              {u.name}
              {u.departmentName && <span className="text-gray-500 ml-2">({u.departmentName})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
