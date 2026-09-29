import { BudgetRepository } from "../repositories/budgetRepository";
import {
  BudgetQueryParams,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from "../schemas/budgetSchema";

export class BudgetService {
  constructor(private repo: BudgetRepository) {}

  async getKpiStats() {
    return await this.repo.getKpiStats();
  }

  async getBudgets(params: BudgetQueryParams) {
    return await this.repo.getBudgets(params);
  }

  async getBudgetById(id: string) {
    const budget = await this.repo.getBudgetById(id);
    if (!budget) throw new Error("Mata Anggaran (MAK) tidak ditemukan");
    return budget;
  }

  async createBudget(dto: CreateBudgetDTO) {
    if (dto.usedBudget > dto.paguBudget) {
      throw new Error("Anggaran terpakai tidak boleh melebihi pagu DIPA");
    }
    return await this.repo.createBudget(dto);
  }

  async updateBudget(id: string, dto: UpdateBudgetDTO) {
    const existing = await this.getBudgetById(id);
    const pagu = dto.paguBudget ?? parseFloat(existing.paguBudget);
    const used = dto.usedBudget ?? parseFloat(existing.usedBudget);

    if (used > pagu) {
      throw new Error("Anggaran terpakai tidak boleh melebihi pagu DIPA");
    }

    return await this.repo.updateBudget(id, dto);
  }

  async deleteBudget(id: string) {
    await this.getBudgetById(id);
    return await this.repo.deleteBudget(id);
  }
}