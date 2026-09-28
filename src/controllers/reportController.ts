import { Request, Response } from "express";
import { ReportService } from "../services/reportService.ts";
import { reportHotelQuerySchema, reportTransportQuerySchema } from "../schemas/reportSchema.ts";

export class ReportController {
  constructor(private reportService: ReportService) {}

  getHotelReport = async (req: Request, res: Response) => {
    try {
      const parsedQuery = reportHotelQuerySchema.parse(req.query);
      const result = await this.reportService.getHotelReport(parsedQuery);

      return res.status(200).json({
        success: true,
        message: "Berhasil mengambil laporan transaksi akomodasi hotel.",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil laporan hotel.",
        errors: error.errors || null,
      });
    }
  };

  getTransportReport = async (req: Request, res: Response) => {
    try {
      const parsedQuery = reportTransportQuerySchema.parse(req.query);
      const result = await this.reportService.getTransportReport(parsedQuery);

      return res.status(200).json({
        success: true,
        message: "Berhasil mengambil laporan transaksi transportasi.",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil laporan transportasi.",
        errors: error.errors || null,
      });
    }
  };
}