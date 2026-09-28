import { Response, Request } from "express";
import { TravelEditOrderService } from "../services/travelEditOrderService.ts";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.ts";
import { updateTravelOrderCorrectionSchema } from "../schemas/travelEditOrderSchema.ts";

export class TravelEditOrderController {
  constructor(private service: TravelEditOrderService) {}

  // GET /api/travel-orders/edit/:identifier
  getCorrectionData = async (req: Request, res: Response) => {
    try {
      const identifier = String(req.params.identifier);
      const data = await this.service.getOrderForCorrection(identifier);

      return res.status(200).json({
        success: true,
        message: "Data koreksi Travel Order berhasil dimuat.",
        data,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Gagal mengambil data koreksi",
      });
    }
  };

  // PUT /api/travel-orders/edit/:id
  submitCorrection = async (req: Request, res: Response) => {
    try {
      const travelOrderId = String(req.params.id || req.body.travelOrderId);

      // Validasi Body Payload dengan Zod
      const parsedPayload = updateTravelOrderCorrectionSchema.parse({
        ...req.body,
        travelOrderId,
      });

      const currentUser = (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Sesi pengguna tidak valid.",
        });
      }

      const updatedOrder = await this.service.submitOrderCorrection(parsedPayload, userId);

      return res.status(200).json({
        success: true,
        message: "Pengajuan perbaikan Travel Order berhasil dikirimkan ulang.",
        data: updatedOrder,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui Travel Order",
      });
    }
  };
}