import { z } from 'zod';

export const leaveFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  leaveTypeId: z.number().int().min(1, { error: '휴가 유형을 선택해주세요' }),
  startDate: z.string().min(1, { error: '시작일을 선택해주세요' }),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  days: z.number().min(0.5),
  reason: z.string().min(1, { error: '사유를 입력해주세요' }),
  emergencyContact: z.string().optional(),
});

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;
