import { Response } from "express";
import { TravelOrderService } from "../services/travelOrderService.ts";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.ts";
import {
  CreateStandaloneTravelOrderSchema,
  AddTransportToExistingTOSchema,
  AddHotelToExistingTOSchema,
} from "../schemas/travelOrderSchema.ts";

export class TravelOrderController {
  constructor(private service: TravelOrderService) {}

  // POST /api/travel-orders (Buat Header TO Mandiri)
  createTravelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const bookerId = req.user?.userId || (req.user as any)?.id;
      if (!bookerId) {
        return res
          .status(401)
          .json({ success: false, message: "Sesi login tidak valid." });
      }

      const validatedBody = CreateStandaloneTravelOrderSchema.parse(req.body);
      const result = await this.service.createTravelOrder(
        bookerId,
        validatedBody,
      );
      return res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  // POST /api/travel-orders/transport (Tambah Transportasi ke TO Existing)
  addTransportOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedBody = AddTransportToExistingTOSchema.parse(req.body);
      const result = await this.service.addTransportOrder(validatedBody);
      return res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  // POST /api/travel-orders/hotel (Tambah Hotel ke TO Existing)
  addHotelOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedBody = AddHotelToExistingTOSchema.parse(req.body);
      const result = await this.service.addHotelOrder(validatedBody);
      return res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  // GET /api/travel-orders/existing
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
}
