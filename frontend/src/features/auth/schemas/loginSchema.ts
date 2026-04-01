import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'validation.emailRequired').email('validation.emailInvalid'),
  password: z.string().min(1, 'validation.passwordRequired'),
  rememberMe: z.boolean(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
