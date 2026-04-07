import { z } from 'zod';

export const expenseItemSchema = z.object({
  description: z.string().min(1, '항목명을 입력해주세요'),
  quantity: z.number().int().min(1, '수량은 1 이상이어야 합니다'),
  unitPrice: z.number().int().min(0, '단가는 0 이상이어야 합니다'),
  amount: z.number().int(),
  note: z.string().optional(),
});

export const expenseFormSchema = z.object({
  items: z
    .array(expenseItemSchema)
    .min(1, '최소 1개의 항목이 필요합니다'),
  totalAmount: z.number().int(),
  paymentMethod: z.string().min(1, '결제 방법을 선택해주세요'),
  accountInfo: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
