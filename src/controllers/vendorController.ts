import { Request, Response } from "express";
import { VendorService } from "../services/VendorService";
import { vendorQuerySchema, createVendorSchema, updateVendorSchema } from "../schemas/vendorSchema";

export class VendorController {
  constructor(private vendorService: VendorService) {}

  getVendors = async (req: Request, res: Response) => {
    try {
      const parsedQuery = vendorQuerySchema.parse(req.query);
      const result = await this.vendorService.getVendorDashboard(parsedQuery);

      return res.status(200).json({
        success: true,
        message: "Berhasil mengambil data maskapai & vendor rekanan.",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengambil data vendor.",
        errors: error.errors || null,
      });
    }
  };

  getVendorById = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await this.vendorService.getVendorById(id);

      return res.status(200).json({
        success: true,
        message: "Berhasil mengambil detail vendor.",
        data: result,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Vendor tidak ditemukan.",
      });
    }
  };

  createVendor = async (req: Request, res: Response) => {
    try {
      const parsedBody = createVendorSchema.parse(req.body);
      const result = await this.vendorService.createVendor(parsedBody);

      return res.status(201).json({
        success: true,
        message: "Berhasil menambahkan maskapai / vendor baru.",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menambahkan vendor.",
        errors: error.errors || null,
      });
    }
  };

  updateVendor = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const parsedBody = updateVendorSchema.parse(req.body);
      const result = await this.vendorService.updateVendor(id, parsedBody);

      return res.status(200).json({
        success: true,
        message: "Berhasil memperbarui data vendor.",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui vendor.",
        errors: error.errors || null,
      });
    }
  };

  deleteVendor = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await this.vendorService.deleteVendor(id);

      return res.status(200).json({
        success: true,
        message: "Berhasil menghapus vendor.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menghapus vendor.",
      });
    }
  };
}