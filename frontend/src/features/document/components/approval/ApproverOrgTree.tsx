import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Loader2, Search, UserPlus } from 'lucide-react';
import apiClient from '../../../../api/client';
import type { ApiResponse } from '../../../../types/api';
import type { DepartmentTreeNode, DepartmentMember } from '../../../../types/admin';

interface OrgUser {
  id: number;
  name: string;
  departmentName: string;
  positionName: string | null;
}

interface ApproverOrgTreeProps {
  onSelectUser: (user: OrgUser) => void;
  excludeUserIds?: number[];
}

interface DepartmentSectionProps {
  dept: DepartmentTreeNode;
  level: number;
  onSelectUser: (user: OrgUser) => void;
  excludeUserIds: number[];
  searchQuery: string;
}

function DepartmentSection({
  dept,
  level,
  onSelectUser,
  excludeUserIds,
  searchQuery,
}: DepartmentSectionProps) {
  // Auto-expand top-level departments (level 0) by default
  const [isExpanded, setIsExpanded] = useState(level === 0);

  const membersQuery = useQuery({
    queryKey: ['departments', dept.id, 'members'],
    queryFn: () => apiClient.get<ApiResponse<DepartmentMember[]>>(`/organization/departments/${dept.id}/members`).then((res) => res.data.data!),
    enabled: isExpanded,
  });

  const filteredMembers = (membersQuery.data ?? []).filter((member) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(q) ||
      (member.positionName?.toLowerCase().includes(q) ?? false)
    );
  });

  // Auto-expand if search matches department name
  const deptMatchesSearch =
    searchQuery && dept.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {isExpanded || deptMatchesSearch ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <span className="font-medium text-gray-900 dark:text-gray-100">{dept.name}</span>
        <span className="text-xs text-gray-400 ml-1">({dept.memberCount})</span>
      </button>

      {(isExpanded || deptMatchesSearch) && (
        <div>
          {membersQuery.isLoading && (
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
            >
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">로딩중...</span>
            </div>
          )}

          {filteredMembers.map((member) => {
            const isDisabled = excludeUserIds.includes(member.id);

            return (
              <button
                key={member.id}
                type="button"
                disabled={isDisabled}
                onClick={() =>
                  onSelectUser({
                    id: member.id,
                    name: member.name,
                    departmentName: dept.name,
                    positionName: member.positionName,
                  })
                }
                className={`flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 ${
                  isDisabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
              >
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {member.name}
                  </div>
                  {member.positionName && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {member.positionName}
                    </div>
                  )}
                </div>
                {!isDisabled && (
                  <UserPlus className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>
            );
          })}

          {/* Nested departments */}
          {dept.children?.map((child) => (
            <DepartmentSection
              key={child.id}
              dept={child}
              level={level + 1}
              onSelectUser={onSelectUser}
              excludeUserIds={excludeUserIds}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApproverOrgTree({
  onSelectUser,
  excludeUserIds = [],
}: ApproverOrgTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'tree'],
    queryFn: () => apiClient.get<ApiResponse<DepartmentTreeNode[]>>('/organization/departments').then((res) => res.data.data!),
  });

  if (departmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!departmentsQuery.data || departmentsQuery.data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <UserPlus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        조직 정보가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 직급 검색..."
          className="w-full h-8 pl-8 pr-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Tree */}
      <div className="space-y-0.5">
        {departmentsQuery.data.map((dept) => (
          <DepartmentSection
            key={dept.id}
            dept={dept}
            level={0}
            onSelectUser={onSelectUser}
            excludeUserIds={excludeUserIds}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}

export type { OrgUser };
