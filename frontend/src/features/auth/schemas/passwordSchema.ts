import { z } from 'zod';

// D-27: min 8 chars, at least 2 of: uppercase, lowercase, number, special
export const passwordStrengthCheck = (password: string): boolean => {
  const categories = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/.test(password),
  ].filter(Boolean).length;
  return password.length >= 8 && categories >= 2;
};

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'passwordChange.wrongCurrent'),
    newPassword: z
      .string()
      .min(8, 'requirements.minLength')
      .refine(passwordStrengthCheck, 'passwordChange.ruleNotMet'),
    confirmPassword: z.string().min(1, 'validation.passwordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'passwordChange.mismatch',
    path: ['confirmPassword'],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
