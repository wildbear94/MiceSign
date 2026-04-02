import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import UserFilterBar from '../components/UserFilterBar';
import UserTable from '../components/UserTable';
import UserFormModal from '../components/UserFormModal';
import Pagination from '../components/Pagination';
import { useUserList } from '../hooks/useUsers';
import { useDepartmentTree } from '../hooks/useDepartments';
import { usePositions } from '../hooks/usePositions';
import type { UserFilterParams } from '../../../types/admin';

export default function UserListPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();

  const [filters, setFilters] = useState<UserFilterParams>({ page: 0, size: 20 });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sortParam = sortField ? `${sortField},${sortDirection}` : undefined;
  const { data, isLoading } = useUserList({ ...filters, sort: sortParam });
  const { data: departments = [] } = useDepartmentTree(false);
  const { data: positions = [] } = usePositions();

  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else {
          // Third click: remove sort
          setSortField(null);
          setSortDirection('asc');
        }
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField, sortDirection],
  );

  const handleRowClick = useCallback(
    (userId: number) => {
      navigate(`/admin/users/${userId}`);
    },
    [navigate],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setFilters((prev) => ({ ...prev, page }));
    },
    [],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('users.title')}
        </h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('users.addUser')}
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4">
        <UserFilterBar
          filters={filters}
          onChange={setFilters}
          departments={departments}
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Table */}
      {data && (
        <>
          <UserTable
            users={data.content}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRowClick={handleRowClick}
          />
          <Pagination
            currentPage={data.number}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Create modal */}
      <UserFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        departments={departments}
        positions={positions}
      />
    </div>
  );
}
