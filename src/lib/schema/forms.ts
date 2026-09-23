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

export const fundSchema = z.object({ amount: amountString })
export const repaySchema = z.object({ amount: amountString })
export const startingCapitalSchema = z.object({
  amount: amountString,
  currency: z.string().length(3),
})
// Перерахунок. Порожній рядок — це «не рахував», і він просто не їде на
// сервер; нуль — це «порахував, там порожньо». Різниця між ними суттєва:
// перше нічого не міняє, друге списує залишок у нестачу.
const countedRow = z.object({
  amount: z
    .string()
    .regex(/^\d*$/, 'Некоректна сума')
    .optional()
    .or(z.literal('')),
})

export const cashCountSchema = z
  .object({
    registers: z.array(countedRow.extend({ registerId: z.string().min(1) })).default([]),
    cash: z.array(countedRow.extend({ currency: z.string().length(3) })).default([]),
    note: z.string().trim().max(280, 'До 280 символів').optional().or(z.literal('')),
  })
  .refine(
    (v) => [...v.registers, ...v.cash].some((row) => row.amount !== '' && row.amount != null),
    { message: 'Заповніть хоча б один залишок', path: ['registers'] },
  )

// Ставку називає сам учасник, приймаючи запрошення. Нуль — звичайний випадок
// (безвідсотковий вклад), тому мінімум саме 0, а не «більше нуля».
export const acceptInviteSchema = z.object({
  ratePercent: z.coerce.number().min(0, 'Ставка не може бути від’ємною').max(200),
})

// Коментар обов'язковий: проводка сама скаже лише «стало менше», а навіщо —
// не пригадає ніхто вже за тиждень.
export const withdrawSchema = z.object({
  currency: z.string().length(3),
  amount: amountString,
  comment: z.string().trim().min(3, 'Вкажіть причину').max(280, 'До 280 символів'),
})

export const claimTransferSchema = z.object({
  toUserId: z.string().min(1, 'Оберіть отримувача'),
  currency: z.string().length(3),
  amount: amountString,
  comment: z.string().trim().max(280, 'До 280 символів').optional().or(z.literal('')),
})

// Витрата або вилучення. Причина обов'язкова — саме з цих рядків складається
// місячний звіт, і «−50 000» без пояснення там нічого не варте.
export const spendingSchema = z.object({
  kind: z.enum(['expense', 'draw', 'capital']),
  source: z.string().min(1, 'Оберіть джерело'),
  currency: z.string().length(3),
  amount: amountString,
  comment: z.string().trim().min(3, 'Вкажіть причину').max(280, 'До 280 символів'),
  // Дата в полі — «2026-09-15», у запиті — повний ISO. Порожньо означає
  // сьогодні, тож і поле лишається порожнім, поки його не чіпали.
  occurredOn: z.string().optional(),
})

export const moveFundsSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  currency: z.string().length(3),
  amount: amountString,
  comment: z.string().trim().max(280).optional().or(z.literal('')),
})
