import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import RegistrationStatusTabs from '../components/RegistrationStatusTabs';
import RegistrationTable from '../components/RegistrationTable';
import RegistrationDetailModal from '../components/RegistrationDetailModal';
import Pagination from '../components/Pagination';
import { useRegistrationList } from '../hooks/useRegistrations';
import { useDepartmentTree } from '../hooks/useDepartments';
import { usePositions } from '../hooks/usePositions';
import type { RegistrationStatus, RegistrationListItem } from '../../../types/admin';

export default function RegistrationListPage() {
  const { t } = useTranslation('admin');

  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | undefined>('PENDING');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<string | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationListItem | null>(null);

  const sortParam = sortField ? `${sortField},${sortDirection}` : 'createdAt,desc';
  const { data, isLoading } = useRegistrationList({
    status: statusFilter,
    page,
    size: 20,
    sort: sortParam,
  });

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

  const handleStatusChange = useCallback((status: RegistrationStatus | undefined) => {
    setStatusFilter(status);
    setPage(0);
  }, []);

  const { data: departments = [] } = useDepartmentTree(false);
  const { data: positions = [] } = usePositions();

  return (
    <div>
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-6">
        {t('registration.title')}
      </h1>
      <div className="mb-4">
        <RegistrationStatusTabs
          activeStatus={statusFilter}
          onChange={handleStatusChange}
        />
      </div>
      <RegistrationTable
        registrations={data?.content ?? []}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={setSelectedRegistration}
        isLoading={isLoading && !data}
      />
      {data && (
        <Pagination
          currentPage={data.number}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
        />
      )}
      <RegistrationDetailModal
        registration={selectedRegistration}
        onClose={() => setSelectedRegistration(null)}
        departments={departments}
        positions={positions}
      />
    </div>
  );
}
