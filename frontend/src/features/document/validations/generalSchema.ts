import { z } from 'zod';

export const generalFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  bodyHtml: z.string().min(1, { error: '내용을 입력해주세요' }),
});

export type GeneralFormValues = z.infer<typeof generalFormSchema>;
