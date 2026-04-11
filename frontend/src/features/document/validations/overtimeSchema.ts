import { z } from 'zod';

export const overtimeFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  workDate: z.string().min(1, { error: '근무 날짜를 선택해주세요' }),
  startTime: z.string().min(1, { error: '시작 시간을 입력해주세요' }),
  endTime: z.string().min(1, { error: '종료 시간을 입력해주세요' }),
  hours: z.number().min(0),
  reason: z.string().min(1, { error: '사유를 입력해주세요' }),
});

export type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;
