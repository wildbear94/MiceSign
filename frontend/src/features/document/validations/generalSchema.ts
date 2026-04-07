import { z } from 'zod';

export const generalFormSchema = z.object({
  bodyHtml: z.string().min(1, '본문을 입력해주세요'),
});

export type GeneralFormValues = z.infer<typeof generalFormSchema>;
