import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { AxiosError } from 'axios';
import { useAuthStore } from '../../../stores/authStore';
import { useCreateUser } from '../hooks/useUsers';
import type { DepartmentTreeNode, PositionItem } from '../../../types/admin';
import type { ApiResponse } from '../../../types/api';

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  departments: DepartmentTreeNode[];
  positions: PositionItem[];
}

const schema = z.object({
  employeeNo: z.string().min(1, '사번을 입력해주세요.').max(20),
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('올바른 이메일 형식이 아닙니다.').max(150),
  departmentId: z.number({ error: '부서를 선택해주세요.' }),
  positionId: z.number().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']),
  phone: z.string().max(20),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(100),
});

type FormValues = z.infer<typeof schema>;

/** Flatten a department tree into a flat list for select options */
function flattenDepartments(nodes: DepartmentTreeNode[]): { id: number; name: string }[] {
  const result: { id: number; name: string }[] = [];
  function walk(list: DepartmentTreeNode[]) {
    for (const node of list) {
      if (node.isActive) {
        result.push({ id: node.id, name: node.name });
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

export default function UserFormModal({ open, onClose, departments, positions }: UserFormModalProps) {
  const { t } = useTranslation('admin');
  const currentUser = useAuthStore((s) => s.user);
  const createUser = useCreateUser();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeNo: '',
      name: '',
      email: '',
      positionId: null,
      role: 'USER',
      phone: '',
      password: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      reset();
      setApiError(null);
      setShowPassword(false);
    }
  }, [open, reset]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    firstFocusable?.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }
    dialog.addEventListener('keydown', handleTab);
    return () => dialog.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  const flatDepts = flattenDepartments(departments);
  const activePositions = positions.filter((p) => p.isActive);

  // Role options per D-32: ADMIN can only create USER
  const roleOptions: { value: string; label: string }[] =
    currentUser?.role === 'SUPER_ADMIN'
      ? [
          { value: 'SUPER_ADMIN', label: t('users.roles.SUPER_ADMIN') },
          { value: 'ADMIN', label: t('users.roles.ADMIN') },
          { value: 'USER', label: t('users.roles.USER') },
        ]
      : [{ value: 'USER', label: t('users.roles.USER') }];

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      await createUser.mutateAsync({
        ...data,
        phone: data.phone ?? '',
      });
      onClose();
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

  const inputClass =
    'w-full h-11 px-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600';
  const labelClass = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1';
  const errorClass = 'text-sm text-red-600 dark:text-red-400 mt-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-modal-title"
        className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-[500px] w-full mx-4 p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="user-form-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-50"
          >
            {t('users.addUser')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API error banner */}
        {apiError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-700 dark:text-red-400">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee No */}
          <div>
            <label htmlFor="employeeNo" className={labelClass}>{t('users.employeeNo')}</label>
            <input id="employeeNo" {...register('employeeNo')} className={inputClass} />
            {errors.employeeNo && <p className={errorClass}>{errors.employeeNo.message}</p>}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className={labelClass}>{t('users.name')}</label>
            <input id="name" {...register('name')} className={inputClass} />
            {errors.name && <p className={errorClass}>{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClass}>{t('users.email')}</label>
            <input id="email" type="email" {...register('email')} className={inputClass} />
            {errors.email && <p className={errorClass}>{errors.email.message}</p>}
          </div>

          {/* Department */}
          <div>
            <label htmlFor="departmentId" className={labelClass}>{t('users.department')}</label>
            <select
              id="departmentId"
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
            {errors.departmentId && <p className={errorClass}>{errors.departmentId.message}</p>}
          </div>

          {/* Position */}
          <div>
            <label htmlFor="positionId" className={labelClass}>{t('users.position')}</label>
            <select
              id="positionId"
              onChange={(e) => {
                const val = e.target.value;
                setValue('positionId', val ? Number(val) : null, { shouldValidate: true });
              }}
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
            <label htmlFor="role" className={labelClass}>{t('users.role')}</label>
            <select id="role" {...register('role')} className={inputClass}>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.role && <p className={errorClass}>{errors.role.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelClass}>{t('users.phone')}</label>
            <input id="phone" {...register('phone')} className={inputClass} />
            {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className={labelClass}>{t('users.password')}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className={errorClass}>{errors.password.message}</p>}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.close')}
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="flex-1 h-11 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('users.addUser')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
