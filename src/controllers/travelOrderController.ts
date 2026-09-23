import { Response } from 'express'
import { TravelOrderService } from '../services/travelOrderService.ts'
import { AuthenticatedRequest } from '../middlewares/authMiddleware.ts'

export class TravelOrderController {
  constructor(private service: TravelOrderService) {}

  // POST /api/travel-orders/flight
  createFlightOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookerId = req.user?.userId || (req.user as any)?.id

      if (!bookerId) {
        return res.status(401).json({ success: false, message: 'Sesi login tidak valid.' })
      }

      const result = await this.service.createFlightOrder(bookerId, req.body)
      return res.status(201).json({ success: true, ...result })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // POST /api/travel-orders/hotel
  createHotelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.createHotelOrder(req.body)
      return res.status(201).json({ success: true, ...result })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }
  getExistingOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, status } = req.query

      const data = await this.service.getExistingOrders(
        search as string,
        status as string
      )

      return res.status(200).json({
        success: true,
        message: 'Daftar Travel Order Existing berhasil diambil.',
        data,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal mengambil data Travel Order Existing',
      })
    }
  }
}