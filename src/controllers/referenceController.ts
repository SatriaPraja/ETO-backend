import { Request, Response } from "express";
import { ReferenceService } from "../services/referenceService";
import {
  GetApproversQuerySchema,
  GetBudgetsQuerySchema,
  GetHotelsQuerySchema,
  GetOfficialBookersQuerySchema,
} from "../schemas/referenceSchema";

export class ReferenceController {
  constructor(private refService: ReferenceService) {}

  getApprovers = async (req: Request, res: Response) => {
    try {
      const parsedQuery = GetApproversQuerySchema.parse(req.query);
      const data = await this.refService.getApprovers(parsedQuery.search);

      return res.status(200).json({
        success: true,
        message: "Daftar Pejabat Penyetuju berhasil diambil.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil data Pejabat Penyetuju",
      });
    }
  };

  getBudgets = async (req: Request, res: Response) => {
    try {
      const parsedQuery = GetBudgetsQuerySchema.parse(req.query);
      const data = await this.refService.getBudgets(parsedQuery.search);

      return res.status(200).json({
        success: true,
        message: "Daftar Mata Anggaran berhasil diambil.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil data Mata Anggaran",
      });
    }
  };
  getHotels = async (req: Request, res: Response) => {
    try {
      const parsedQuery = GetHotelsQuerySchema.parse(req.query);
      const data = await this.refService.getHotels(parsedQuery.search);

      return res.status(200).json({
        success: true,
        message: "Daftar Master Hotel berhasil diambil.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil data Master Hotel",
      });
    }
  };
  getOfficialBookers = async (req: Request, res: Response) => {
    try {
      const validatedQuery = GetOfficialBookersQuerySchema.parse(req.query);
      const bookers = await this.refService.getOfficialBookers(validatedQuery);

      return res.status(200).json({
        success: true,
        message: "Berhasil memuat daftar Official Booker",
        data: bookers,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memuat daftar Official Booker",
      });
    }
  };
}
