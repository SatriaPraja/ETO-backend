import type { Response } from "express";
import { UserService } from "../services/userService.ts";
import { AuthenticatedRequest } from "../middlewares/authMiddleware.ts";

export class UserController {
  constructor(private userService: UserService) {}

  create = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.userService.createUser(req.body)
      return res.status(201).json({
        success: true,
        message: 'Pengguna baru berhasil didaftarkan.',
        data: result,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal mendaftarkan pengguna.',
      })
    }
}

 getAll = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Ambil data query dari validatedQuery jika ada, fallback ke req.query
      const queryParams = (req as any).validatedQuery || req.query

      const result = await this.userService.getAllUsers(queryParams as any)
      return res.status(200).json({
        success: true,
        message: 'Daftar pengguna berhasil diambil.',
        data: result.users,
        meta: result.meta,
      })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal mengambil daftar pengguna.',
      })
    }
  }

  update = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Pastikan id diambil sebagai string
      const id = req.params.id as string;

      const result = await this.userService.updateUser(id, req.body);
      return res.status(200).json({
        success: true,
        message: "Data pengguna berhasil diperbarui.",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui pengguna.",
      });
    }
  };

  toggleStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Pastikan id diambil sebagai string
      const id = req.params.id as string;
      const { status } = req.body;

      const result = await this.userService.toggleStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Status pengguna berhasil diubah menjadi ${status}.`,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal mengubah status pengguna.",
      });
    }
  };
}
