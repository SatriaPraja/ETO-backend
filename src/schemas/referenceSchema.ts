import { z } from 'zod'

export const GetApproversQuerySchema = z.object({
  search: z.string().optional(),
})

export const GetBudgetsQuerySchema = z.object({
  search: z.string().optional(),
})

export const GetHotelsQuerySchema = z.object({
  search: z.string().optional(),
})

export const GetOfficialBookersQuerySchema = z.object({
  search: z.string().optional(),
})

export type GetApproversQueryDTO = z.infer<typeof GetApproversQuerySchema>
export type GetBudgetsQueryDTO = z.infer<typeof GetBudgetsQuerySchema>
export type GetHotelsQueryDTO = z.infer<typeof GetHotelsQuerySchema>
export type GetOfficialBookersQuery = z.infer<typeof GetOfficialBookersQuerySchema>