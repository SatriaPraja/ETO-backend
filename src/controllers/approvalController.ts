import { Request, Response } from 'express';
import { ApprovalService } from '../services/approvalService';
import { getInboxQuerySchema, updateStatusSchema } from '../schemas/approvalSchema';


export class ApprovalController {
  constructor(private service: ApprovalService) {}

  updateStatus = async (req: Request, res: Response) => {
    try {
      // Validasi body dengan Zod
      const parsedBody = updateStatusSchema.parse(req.body);

      // User yang sedang login (didapat dari Auth Middleware)
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ success: false, message: 'Autentikasi diperlukan' });
      }

      const result = await this.service.updateStatus(parsedBody, currentUser);

      return res.status(200).json({
        success: true,
        message: 'Status Travel Order berhasil diperbarui',
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal memperbarui status'
      });
    }
  };
  getInbox = async (req: Request, res: Response) => {
    try {
      const parsedQuery = getInboxQuerySchema.parse(req.query);
      const currentUser = (req as any).user;

      if (!currentUser) {
        return res.status(401).json({ success: false, message: 'Autentikasi diperlukan' });
      }

      const result = await this.service.getInbox(parsedQuery, currentUser);

      return res.status(200).json({
        success: true,
        message: 'Data inbox persetujuan berhasil dimuat',
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Gagal memuat inbox persetujuan'
      });
    }
  };
}