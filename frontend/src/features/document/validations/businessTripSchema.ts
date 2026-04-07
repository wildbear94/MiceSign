import { z } from 'zod';

export const itineraryItemSchema = z.object({
  date: z.string().min(1, '날짜를 입력해주세요'),
  destination: z.string().min(1, '방문지를 입력해주세요'),
  purpose: z.string().min(1, '목적을 입력해주세요'),
  transport: z.string().optional(),
});

export const tripExpenseSchema = z.object({
  category: z.string().min(1, '비용 항목을 입력해주세요'),
  amount: z.number().int().min(0, '금액은 0 이상이어야 합니다'),
  note: z.string().optional(),
});

export const businessTripFormSchema = z
  .object({
    destination: z.string().min(1, '출장지를 입력해주세요'),
    startDate: z.string().min(1, '시작일을 입력해주세요'),
    endDate: z.string().min(1, '종료일을 입력해주세요'),
    purpose: z.string().min(1, '출장 목적을 입력해주세요'),
    itinerary: z
      .array(itineraryItemSchema)
      .min(1, '최소 1개의 일정이 필요합니다'),
    expenses: z.array(tripExpenseSchema).optional(),
    totalExpense: z.number().int().optional(),
    accompanies: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: '종료일은 시작일 이후여야 합니다',
    path: ['endDate'],
  });

export type BusinessTripFormValues = z.infer<typeof businessTripFormSchema>;
