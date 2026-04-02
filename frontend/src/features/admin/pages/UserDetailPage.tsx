import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
import AdminPasswordResetModal from '../../auth/components/AdminPasswordResetModal';
import AdminUnlockButton from '../../auth/components/AdminUnlockButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { useUserDetail, useUpdateUser, useDeactivateUser } from '../hooks/useUsers';
import { useDepartmentTree } from '../hooks/useDepartments';
import { usePositions } from '../hooks/usePositions';
import { useAuthStore } from '../../../stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import type { DepartmentTreeNode } from '../../../types/admin';
import type { ApiResponse } from '../../../types/api';

const editSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').max(150),
  departmentId: z.number({ error: '부서를 선택해주세요.' }),
  positionId: z.number().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RETIRED']),
  phone: z.string().max(20),
});

type EditFormValues = z.infer<typeof editSchema>;

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  USER: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  RETIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function flattenDepartments(nodes: DepartmentTreeNode[]): { id: number; name: string }[] {
  const result: { id: number; name: string }[] = [];
  function walk(list: DepartmentTreeNode[]) {
    for (const node of list) {
      if (node.isActive) result.push({ id: node.id, name: node.name });
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function UserDetailPage() {
  const { t } = useTranslation('admin');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const userId = Number(id);
  const { data: user, isLoading, error } = useUserDetail(userId);
  const { data: departments = [] } = useDepartmentTree(false);
  const { data: positions = [] } = usePositions();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  const enterEditMode = useCallback(() => {
    if (!user) return;
    reset({
      name: user.name,
      email: user.email,
      departmentId: user.departmentId,
      positionId: user.positionId,
      role: user.role,
      status: user.status,
      phone: user.phone ?? '',
    });
    setApiError(null);
    setIsEditing(true);
  }, [user, reset]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setApiError(null);
  }, []);

  const onSubmitEdit = async (data: EditFormValues) => {
    setApiError(null);
    try {
      await updateUser.mutateAsync({
        id: userId,
        data: {
          ...data,
          phone: data.phone ?? '',
        },
      });
      setIsEditing(false);
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      const code = axiosError.response?.data?.error?.code;
      if (code) {
        setApiError(t(`errors.${code}`, { defaultValue: axiosError.response?.data?.error?.message ?? '' }));
      } else {
        setApiError(t('errors.NETWORK_ERROR'));
      }
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateUser.mutateAsync(userId);
      navigate('/admin/users');
    } catch {
      setShowDeactivateDialog(false);
    }
  };

  // Can current user deactivate this user?
  const canDeactivate =
    user &&
    user.status === 'ACTIVE' &&
    currentUser?.id !== user.id &&
    (user.role !== 'SUPER_ADMIN' || currentUser?.role === 'SUPER_ADMIN');

  // Role edit restrictions per D-32
  const roleOptions: { value: string; label: string; disabled?: boolean }[] =
    currentUser?.role === 'SUPER_ADMIN'
      ? [
          { value: 'SUPER_ADMIN', label: t('users.roles.SUPER_ADMIN') },
          { value: 'ADMIN', label: t('users.roles.ADMIN') },
          { value: 'USER', label: t('users.roles.USER') },
        ]
      : [{ value: 'USER', label: t('users.roles.USER') }];

  // ADMIN cannot change role of ADMIN/SUPER_ADMIN users
  const roleFieldDisabled =
    currentUser?.role === 'ADMIN' &&
    user &&
    (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  const flatDepts = flattenDepartments(departments);
  const activePositions = positions.filter((p) => p.isActive);

  // Loading
  if (isLoading) {
    return (
      <div>
        <Link
          to="/admin/users"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4 inline-block"
        >
          &lt; {t('users.title')}
        </Link>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error / Not found
  if (error || !user) {
    return (
      <div>
        <Link
          to="/admin/users"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4 inline-block"
        >
          &lt; {t('users.title')}
        </Link>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            사용자를 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full h-11 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600';
  const labelClass = 'text-sm font-semibold text-gray-600 dark:text-gray-400';
  const valueClass = 'text-sm text-gray-900 dark:text-gray-50';
  const errorMsgClass = 'text-sm text-red-600 dark:text-red-400 mt-1';

  return (
    <div>
      {/* Back navigation */}
      <Link
        to="/admin/users"
        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mb-4 inline-block"
      >
        &lt; {t('users.title')}
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Header with action buttons */}
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
            {t('users.detail')}
          </h1>

          <div className="flex gap-2 flex-wrap justify-end">
            {!isEditing && (
              <>
                <button
                  type="button"
                  onClick={enterEditMode}
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg px-4 h-11 text-sm font-medium"
                >
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasswordResetModal(true)}
                  className="inline-flex items-center h-11 px-4 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  비밀번호 초기화
                </button>

                {user.isLocked && (
                  <AdminUnlockButton
                    userId={user.id}
                    userName={user.name}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['users', userId] });
                    }}
                  />
                )}

                {canDeactivate && (
                  <button
                    type="button"
                    onClick={() => setShowDeactivateDialog(true)}
                    className="inline-flex items-center h-11 px-4 text-sm font-medium rounded-lg text-red-600 hover:text-red-700 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {t('common.deactivate')}
                  </button>
                )}
              </>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-11 px-4 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancelEdit')}
                </button>
                <button
                  type="submit"
                  form="edit-user-form"
                  disabled={updateUser.isPending}
                  className="h-11 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.save')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-400">{apiError}</p>
          </div>
        )}

        {/* Read-only mode */}
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={labelClass}>{t('users.employeeNo')}</div>
              <div className={valueClass}>{user.employeeNo}</div>
            </div>
            <div>
              <div className={labelClass}>{t('users.name')}</div>
              <div className={valueClass}>{user.name}</div>
            </div>
            <div>
              <div className={labelClass}>{t('users.email')}</div>
              <div className={valueClass}>{user.email}</div>
            </div>
            <div>
              <div className={labelClass}>{t('users.department')}</div>
              <div className={valueClass}>{user.departmentName}</div>
            </div>
            <div>
              <div className={labelClass}>{t('users.position')}</div>
              <div className={valueClass}>{user.positionName ?? '-'}</div>
            </div>
            <div>
              <div className={labelClass}>{t('users.role')}</div>
              <div>
                <span className={`text-xs px-2 py-0.5 rounded ${ROLE_BADGE[user.role] ?? ''}`}>
                  {t(`users.roles.${user.role}`)}
                </span>
              </div>
            </div>
            <div>
              <div className={labelClass}>{t('users.status')}</div>
              <div>
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE[user.status] ?? ''}`}>
                  {t(`users.statuses.${user.status}`)}
                </span>
              </div>
            </div>
            <div>
              <div className={labelClass}>{t('users.phone')}</div>
              <div className={valueClass}>{user.phone ?? '-'}</div>
            </div>
            <div>
              <div className={labelClass}>{t('users.lastLogin')}</div>
              <div className={valueClass}>
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '로그인 기록 없음'}
              </div>
            </div>
            <div>
              <div className={labelClass}>{t('users.createdAt')}</div>
              <div className={valueClass}>{formatDateTime(user.createdAt)}</div>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {isEditing && (
          <form
            id="edit-user-form"
            onSubmit={handleSubmit(onSubmitEdit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Employee No (read-only in edit) */}
            <div>
              <div className={labelClass}>{t('users.employeeNo')}</div>
              <div className={valueClass}>{user.employeeNo}</div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="edit-name" className={labelClass}>{t('users.name')}</label>
              <input id="edit-name" {...register('name')} className={inputClass} />
              {errors.name && <p className={errorMsgClass}>{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="edit-email" className={labelClass}>{t('users.email')}</label>
              <input id="edit-email" type="email" {...register('email')} className={inputClass} />
              {errors.email && <p className={errorMsgClass}>{errors.email.message}</p>}
            </div>

            {/* Department */}
            <div>
              <label htmlFor="edit-dept" className={labelClass}>{t('users.department')}</label>
              <select
                id="edit-dept"
                {...register('departmentId', { valueAsNumber: true })}
                onChange={(e) => {
                  const val = e.target.value;
                  setValue('departmentId', val ? Number(val) : (undefined as unknown as number), { shouldValidate: true });
                }}
                className={inputClass}
              >
                <option value="">{t('users.filterDepartment')}</option>
                {flatDepts.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className={errorMsgClass}>{errors.departmentId.message}</p>}
            </div>

            {/* Position */}
            <div>
              <label htmlFor="edit-pos" className={labelClass}>{t('users.position')}</label>
              <select
                id="edit-pos"
                onChange={(e) => {
                  const val = e.target.value;
                  setValue('positionId', val ? Number(val) : null, { shouldValidate: true });
                }}
                defaultValue={user.positionId ?? ''}
                className={inputClass}
              >
                <option value="">{t('users.noPosition')}</option>
                {activePositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>{pos.name}</option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="edit-role" className={labelClass}>{t('users.role')}</label>
              <select
                id="edit-role"
                {...register('role')}
                disabled={!!roleFieldDisabled}
                className={`${inputClass} ${roleFieldDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.role && <p className={errorMsgClass}>{errors.role.message}</p>}
            </div>

            {/* Status */}
            <div>
              <label htmlFor="edit-status" className={labelClass}>{t('users.status')}</label>
              <select id="edit-status" {...register('status')} className={inputClass}>
                <option value="ACTIVE">{t('users.statuses.ACTIVE')}</option>
                <option value="INACTIVE">{t('users.statuses.INACTIVE')}</option>
                <option value="RETIRED">{t('users.statuses.RETIRED')}</option>
              </select>
              {errors.status && <p className={errorMsgClass}>{errors.status.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="edit-phone" className={labelClass}>{t('users.phone')}</label>
              <input id="edit-phone" {...register('phone')} className={inputClass} />
              {errors.phone && <p className={errorMsgClass}>{errors.phone.message}</p>}
            </div>
          </form>
        )}
      </div>

      {/* Password Reset Modal */}
      <AdminPasswordResetModal
        userId={user.id}
        userName={user.name}
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['users', userId] });
        }}
      />

      {/* Deactivation Confirm Dialog */}
      <ConfirmDialog
        open={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        title="사용자 비활성화"
        message="이 사용자를 비활성화하시겠습니까?"
        confirmLabel={t('common.deactivate')}
        confirmVariant="danger"
        isLoading={deactivateUser.isPending}
      />
    </div>
  );
}
