import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export type ValidationTarget = 'body' | 'query' | 'params'

export const validateRequest = (
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target] || {}
      const parsedData = await schema.parseAsync(dataToValidate)

      // 🔴 Hindari menimpa req.query karena getter-only pada Express IncomingMessage
      if (target === 'body' || target === 'params') {
        req[target] = parsedData
      } else if (target === 'query') {
        // Simpan hasil parse angka/transformasi ke properti kustom req
        ;(req as any).validatedQuery = parsedData
      }

      next()
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validasi input gagal.',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }

      console.error(`❌ [validateRequest Error on ${target}]:`, error)

      return res.status(500).json({
        success: false,
        message: error?.message || 'Internal Server Error',
      })
    }
  }
}