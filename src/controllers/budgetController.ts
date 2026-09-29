import { Request, Response } from "express";
import { BudgetService } from "../services/budgetService";
import {
  budgetQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
} from "../schemas/budgetSchema";

export class BudgetController {
  constructor(private service: BudgetService) {}

  getKpiStats = async (_req: Request, res: Response) => {
    try {
      const data = await this.service.getKpiStats();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  };

  getBudgets = async (req: Request, res: Response) => {
    try {
      const query = budgetQuerySchema.parse(req.query);
      const result = await this.service.getBudgets(query);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  getBudgetById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const data = await this.service.getBudgetById(id);
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({ success: false, message: error.message });
    }
  };

  createBudget = async (req: Request, res: Response) => {
    try {
      const dto = createBudgetSchema.parse(req.body);
      const data = await this.service.createBudget(dto);
      return res.status(201).json({
        success: true,
        message: "Mata Anggaran (MAK) berhasil dibuat",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  updateBudget = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const dto = updateBudgetSchema.parse(req.body);
      const data = await this.service.updateBudget(id, dto);
      return res.status(200).json({
        success: true,
        message: "Mata Anggaran (MAK) berhasil diperbarui",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };

  deleteBudget = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await this.service.deleteBudget(id);
      return res.status(200).json({
        success: true,
        message: "Mata Anggaran (MAK) berhasil dihapus",
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  };
}