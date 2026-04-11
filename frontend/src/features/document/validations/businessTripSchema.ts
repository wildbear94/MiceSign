import { z } from 'zod';

export const itineraryItemSchema = z.object({
  date: z.string().min(1, { error: '날짜를 입력해주세요' }),
  location: z.string().min(1, { error: '장소를 입력해주세요' }),
  description: z.string().optional(),
});

export const tripExpenseItemSchema = z.object({
  category: z.string().min(1, { error: '분류를 입력해주세요' }),
  amount: z.number().int().min(0, { error: '금액을 올바르게 입력해주세요' }),
  description: z.string().optional(),
});

export const businessTripFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  destination: z.string().min(1, { error: '출장지를 입력해주세요' }),
  startDate: z.string().min(1, { error: '출장 시작일을 선택해주세요' }),
  endDate: z.string().min(1, { error: '출장 종료일을 선택해주세요' }),
  purpose: z.string().min(1, { error: '출장 목적을 입력해주세요' }),
  itinerary: z.array(itineraryItemSchema).min(1, { error: '일정을 1개 이상 추가해주세요' }),
  expenses: z.array(tripExpenseItemSchema).optional(),
  totalExpense: z.number().int().min(0).optional(),
});

export type BusinessTripFormValues = z.infer<typeof businessTripFormSchema>;
