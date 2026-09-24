import { Response, Request } from "express";
import { TravelOrderService } from "../services/travelOrderService.ts";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.ts";
import { updateTravelOrderSchema } from "../schemas/travelOrderSchema.ts";

export class TravelOrderController {
  constructor(private service: TravelOrderService) {}

  // POST /api/travel-orders/flight
  createFlightOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookerId = req.user?.userId || (req.user as any)?.id;

      if (!bookerId) {
        return res
          .status(401)
          .json({ success: false, message: "Sesi login tidak valid." });
      }

      const result = await this.service.createFlightOrder(bookerId, req.body);
      return res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  // POST /api/travel-orders/hotel
  createHotelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.service.createHotelOrder(req.body);
      return res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };
  getExistingOrders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, status } = req.query;

      const data = await this.service.getExistingOrders(
        search as string,
        status as string,
      );

      return res.status(200).json({
        success: true,
        message: "Daftar Travel Order Existing berhasil diambil.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil data Travel Order Existing",
      });
    }
  };

  updateOrder = async (req: Request, res: Response) => {
    try {
      const expressReq = req as unknown as {
        params: { id?: string };
        body: any;
      };
      const travelOrderId =
        expressReq.params.id || expressReq.body.travelOrderId;

      const parsedBody = updateTravelOrderSchema.parse({
        ...req.body,
        travelOrderId,
      });

      const currentUser = (req as any).user;
      const userId = currentUser?.id || currentUser?.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Autentikasi tidak valid" });
      }

      const updatedData = await this.service.editAndResubmitOrder(
        parsedBody,
        userId,
      );

      return res.status(200).json({
        success: true,
        message:
          "Pengajuan Travel Order (Transport & Hotel) berhasil dikoreksi dan dikirim ulang",
        data: updatedData,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui Travel Order",
      });
    }
  };
}
