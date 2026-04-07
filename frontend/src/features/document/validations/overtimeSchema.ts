import { z } from 'zod';

export const overtimeFormSchema = z.object({
  workDate: z.string().min(1, '근무일을 입력해주세요'),
  startTime: z.string().min(1, '시작 시간을 입력해주세요'),
  endTime: z.string().min(1, '종료 시간을 입력해주세요'),
  hours: z.number().positive('시간은 0보다 커야 합니다'),
  reason: z.string().min(1, '사유를 입력해주세요'),
  managerName: z.string().optional(),
});

export type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;
