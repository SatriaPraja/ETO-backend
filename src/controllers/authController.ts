import type { Response } from 'express'
import { AuthService } from '../services/authService.ts'
import { AuthenticatedRequest } from '../middlewares/authMiddleware.ts'

const COOKIE_OPTIONS = {
  httpOnly: true, // Proteksi dari XSS
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 8 * 60 * 60 * 1000, // 8 jam
}

export class AuthController {
  constructor(private authService: AuthService) {}


  login = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.authService.login(req.body)

      // Set Token ke Cookie
      res.cookie('token', result.accessToken, COOKIE_OPTIONS)

      return res.status(200).json({
        success: true,
        message: 'Login berhasil.',
        data: {
          user: result.user,
          availableRoles: result.availableRoles,
          activeRole: result.activeRole,
        },
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal melakukan login.',
      })
    }
  }

  logout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.rawToken) {
        await this.authService.logout(req.rawToken, req.user?.exp)
      }

      // Hapus Cookie dari Browser
      res.clearCookie('token')

      return res.status(200).json({
        success: true,
        message: 'Logout berhasil. Sesi cookie telah dihapus.',
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Gagal melakukan logout.',
      })
    }
  }

  switchRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetRoleId } = req.body
      const userId = req.user?.userId

      if (!userId) return res.status(401).json({ success: false, message: 'Tidak terotorisasi.' })

      const result = await this.authService.switchRole(userId, targetRoleId)

      // Timpa Cookie dengan token baru
      res.cookie('token', result.accessToken, COOKIE_OPTIONS)

      return res.status(200).json({
        success: true,
        message: 'Peran berhasil diubah.',
        data: { activeRole: result.activeRole },
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal mengubah peran.',
      })
    }
  }

  me = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId
      const activeRole = req.user?.activeRole

      if (!userId || !activeRole) return res.status(401).json({ success: false, message: 'Tidak terotorisasi.' })

      const result = await this.authService.getProfile(userId, activeRole)
      return res.status(200).json({
        success: true,
        message: 'Data profil berhasil diambil.',
        data: result,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal mengambil profil.',
      })
    }
  }
}