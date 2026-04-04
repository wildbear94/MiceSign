import { z } from 'zod';

export const purchaseItemSchema = z.object({
  name: z.string().min(1, { error: '품목명을 입력해주세요' }),
  spec: z.string().optional().default(''),
  quantity: z.number().int().min(1, { error: '수량을 올바르게 입력해주세요' }),
  unitPrice: z.number().int().min(0, { error: '단가를 올바르게 입력해주세요' }),
  amount: z.number().int().min(0),
});

export const purchaseFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  supplier: z.string().min(1, { error: '납품업체명을 입력해주세요' }),
  deliveryDate: z.string().min(1, { error: '희망 납품일을 선택해주세요' }),
  paymentMethod: z.string().min(1, { error: '결제 방법을 선택해주세요' }),
  purchaseReason: z.string().min(1, { error: '구매 사유를 입력해주세요' }),
  items: z.array(purchaseItemSchema).min(1, { error: '최소 1개 품목을 입력해주세요' }),
  totalAmount: z.number().int().min(0),
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;
