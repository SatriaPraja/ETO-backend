import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { redis } from '../config/redis.ts'
import { UserRole } from '../schemas/authSchema.ts'

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_eto_bpjs_2026'

export interface JWTPayload {
  userId: string
  npk: string
  activeRole: UserRole
  exp?: number
}

export interface AuthenticatedRequest<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: JWTPayload
  rawToken?: string
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. Ambil token dari HTTP-Only Cookie atau Authorization Bearer Header
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Sesi tidak ditemukan (Cookie/Token tidak terdeteksi).',
    })
  }

  try {
    // 2. Cek apakah token berada di Blacklist Redis (Sudah di-logout)
    const isBlacklisted = await redis.get(`blacklist:${token}`)
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Sesi telah diakhiri. Silakan login kembali.',
      })
    }

    // 3. Verifikasi payload token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    req.user = decoded
    req.rawToken = token
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Sesi tidak valid atau telah kedaluwarsa.',
    })
  }
}

/**
 * Middleware Otorisasi Berbasis Peran (RBAC)
 * Memeriksa apakah activeRole pengguna yang terautentikasi sesuai dengan daftar peran yang diizinkan.
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.activeRole) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak. Pengguna belum teridentifikasi.',
      })
    }

    if (!allowedRoles.includes(req.user.activeRole)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki hak akses untuk fitur ini.',
      })
    }

    next()
  }
}