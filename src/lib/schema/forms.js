import { z } from 'zod'

// Client-side mirrors of the server schemas (SERVER_PLAN §2.3). They exist to
// catch mistakes before a round trip — the server validates independently and
// remains the authority. Where the two disagree, the server wins.

const amountString = z
  .string()
  .min(1, 'Введіть суму')
  .regex(/^\d+$/, 'Некоректна сума')
  .refine((v) => BigInt(v) > 0n, 'Сума має бути більшою за нуль')

export const loginSchema = z.object({
  email: z.string().email('Некоректна пошта'),
  password: z.string().min(1, 'Введіть пароль'),
})

export const registerSchema = z.object({
  email: z.string().email('Некоректна пошта'),
  password: z.string().min(8, 'Мінімум 8 символів'),
  displayName: z.string().trim().min(2, 'Мінімум 2 символи').max(80),
  capability: z.enum(['invest', 'borrow']),
})

export const transferSchema = z.object({
  toUserId: z.string().min(1, 'Оберіть отримувача'),
  currency: z.string().length(3),
  amount: amountString,
  comment: z.string().trim().max(280, 'До 280 символів').optional().or(z.literal('')),
})

export const businessSchema = z.object({
  name: z.string().trim().min(2, 'Мінімум 2 символи').max(120),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  baseCurrency: z.string().length(3),
})

export const registerCashSchema = z.object({
  name: z.string().trim().min(1, 'Вкажіть назву').max(80),
  currency: z.string().length(3),
})

export const fundingRequestSchema = z.object({
  currency: z.string().length(3),
  amountTarget: amountString,
  // Entered as a percentage, sent as basis points — the wire format is bps
  // everywhere so requests stay comparable (§6.4).
  // 0 is allowed: an interest-free request is valid (see SERVER_PLAN §2.3).
  ratePercent: z.coerce.number().min(0, 'Ставка не може бути від’ємною').max(200),
  termDays: z.coerce.number().int().min(7, 'Мінімум 7 днів').max(3650),
  repaymentType: z.enum(['bullet', 'interest_only_flex']),
  minTicket: amountString,
  minFillPercent: z.coerce.number().min(0).max(100),
  purpose: z.string().trim().max(1000).optional().or(z.literal('')),
  expiresAt: z.string().min(1, 'Оберіть дедлайн'),
})

export const fundSchema = z.object({ amount: amountString })
export const repaySchema = z.object({ amount: amountString })
export const startingCapitalSchema = z.object({
  amount: amountString,
  currency: z.string().length(3),
})
export const moveFundsSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  currency: z.string().length(3),
  amount: amountString,
  comment: z.string().trim().max(280).optional().or(z.literal('')),
})
