import { z } from 'zod';

export const leaveFormSchema = z
  .object({
    leaveType: z.string().min(1, '휴가 유형을 선택해주세요'),
    startDate: z.string().min(1, '시작일을 입력해주세요'),
    endDate: z.string().min(1, '종료일을 입력해주세요'),
    days: z.number().positive('일수는 0보다 커야 합니다'),
    reason: z.string().min(1, '사유를 입력해주세요'),
    emergencyContact: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: '종료일은 시작일 이후여야 합니다',
    path: ['endDate'],
  });

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
