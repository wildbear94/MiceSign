import { z } from 'zod';

export const expenseItemSchema = z.object({
  name: z.string().min(1, { error: '항목명을 입력해주세요' }),
  quantity: z.number().int().min(1, { error: '수량을 올바르게 입력해주세요' }),
  unitPrice: z.number().int().min(0, { error: '단가를 올바르게 입력해주세요' }),
  amount: z.number().int().min(0),
});

export const expenseFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  items: z.array(expenseItemSchema).min(1, { error: '항목을 1개 이상 추가해주세요' }),
  totalAmount: z.number().int().min(0),
  paymentMethod: z.string().optional(),
  accountInfo: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
