import { Request, Response } from 'express'
import { HistoryService } from '../services/historyService.js'
import { GetHistoryOrdersQuerySchema } from '../schemas/historySchema.js'

export class HistoryController {
  constructor(private historyService: HistoryService) {}

  getOrderHistory = async (req: Request, res: Response) => {
    try {
      const userPayload = (req as any).user

      console.log('🔍 [DEBUG HISTORY CONTROLLER] User Payload:', userPayload)

      const userId = userPayload?.id || userPayload?.user?.id
      
      // 🟢 Ambil activeRole terlebih dahulu, atau dari array availableRoles, atau fallback ke role
      const activeRole = 
        userPayload?.activeRole || 
        userPayload?.role || 
        userPayload?.userRole || 
        (Array.isArray(userPayload?.availableRoles) 
          ? userPayload.availableRoles.map((r: any) => r.name) 
          : 'OFFICIAL_BOOKER')

      const validatedQuery = GetHistoryOrdersQuerySchema.parse(req.query)

      const result = await this.historyService.getOrderHistory(userId, activeRole, validatedQuery)

      return res.status(200).json({
        success: true,
        message: 'Berhasil memuat riwayat pengajuan Travel Order',
        data: result.items,
        pagination: result.meta,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal memuat riwayat pengajuan Travel Order',
      })
    }
  }
}