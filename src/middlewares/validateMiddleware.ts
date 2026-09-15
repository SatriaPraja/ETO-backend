import type { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validasi input gagal.',
          // Ganti error.errors menjadi error.issues
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }
      return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
  }
}