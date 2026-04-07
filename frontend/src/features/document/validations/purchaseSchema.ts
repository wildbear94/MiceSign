import { z } from 'zod';

export const purchaseItemSchema = z.object({
  name: z.string().min(1, '품명을 입력해주세요'),
  specification: z.string().optional(),
  quantity: z.number().int().min(1, '수량은 1 이상이어야 합니다'),
  unitPrice: z.number().int().min(0, '단가는 0 이상이어야 합니다'),
  amount: z.number().int(),
  note: z.string().optional(),
});

export const purchaseFormSchema = z.object({
  supplier: z.string().optional(),
  items: z
    .array(purchaseItemSchema)
    .min(1, '최소 1개의 항목이 필요합니다'),
  totalAmount: z.number().int(),
  deliveryDate: z.string().optional(),
  paymentTerms: z.string().optional(),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
