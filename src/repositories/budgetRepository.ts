import { Pool } from "pg";
import {
  BudgetQueryParams,
  CreateBudgetDTO,
  UpdateBudgetDTO,
} from "../schemas/budgetSchema";

export class BudgetRepository {
  constructor(private pool: Pool) {}

  // 1. Ambil Statistik KPI Anggaran
  async getKpiStats() {
    const query = `
      SELECT 
        COALESCE(SUM(pagu_budget), 0)::NUMERIC AS "totalPagu",
        COALESCE(SUM(used_budget), 0)::NUMERIC AS "totalRealisasi",
        COALESCE(
          (
            SELECT SUM(total_estimated_cost)
            FROM travel_orders
            WHERE status = 'WAITING_PEJABAT'
          ), 0
        )::NUMERIC AS "totalPersetujuan",
        COUNT(*)::INT AS "totalAkun",
        COUNT(DISTINCT office_name)::INT AS "totalUnitKerja",
        (
          SELECT COUNT(*)::INT
          FROM travel_orders
          WHERE status = 'WAITING_PEJABAT'
        ) AS "totalPengajuanInApproval"
      FROM master_budgets;
    `;

    const res = await this.pool.query(query);
    const row = res.rows[0];

    const totalPagu = parseFloat(row.totalPagu);
    const totalRealisasi = parseFloat(row.totalRealisasi);
    const totalPersetujuan = parseFloat(row.totalPersetujuan);
    const sisaSaldo = totalPagu - totalRealisasi - totalPersetujuan;

    return {
      totalPaguDipa: totalPagu,
      totalRealisasiIssued: totalRealisasi,
      realisasiPercentage: totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : "0.0",
      dalamProsesPersetujuan: totalPersetujuan,
      totalPengajuanCount: row.totalPengajuanInApproval,
      persetujuanPercentage: totalPagu > 0 ? ((totalPersetujuan / totalPagu) * 100).toFixed(1) : "0.0",
      sisaSaldoPaguTersedia: sisaSaldo > 0 ? sisaSaldo : 0,
      sisaPercentage: totalPagu > 0 ? ((sisaSaldo / totalPagu) * 100).toFixed(1) : "0.0",
      totalAkunCoa: row.totalAkun,
      totalUnitKerja: row.totalUnitKerja,
    };
  }

  // 2. Ambil List Anggaran dengan Search, Filter & Pagination
  async getBudgets(params: BudgetQueryParams) {
    const conditions: string[] = ["1=1"];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(account_number ILIKE $${paramIndex} OR account_name ILIKE $${paramIndex} OR activity_name ILIKE $${paramIndex} OR program_name ILIKE $${paramIndex})`
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.officeName) {
      conditions.push(`office_name = $${paramIndex++}`);
      queryParams.push(params.officeName);
    }

    if (params.status && params.status !== "all") {
      if (params.status === "aman") {
        conditions.push(`((pagu_budget - used_budget) / NULLIF(pagu_budget, 0)) >= 0.5`);
      } else if (params.status === "warning") {
        conditions.push(`((pagu_budget - used_budget) / NULLIF(pagu_budget, 0)) < 0.2 AND ((pagu_budget - used_budget) / NULLIF(pagu_budget, 0)) > 0`);
      } else if (params.status === "critical") {
        conditions.push(`(pagu_budget - used_budget) <= 0`);
      }
    }

    const whereClause = conditions.join(" AND ");
    const offset = (params.page - 1) * params.limit;

    const countQuery = `SELECT COUNT(*)::INT AS total FROM master_budgets WHERE ${whereClause};`;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalData = countRes.rows[0]?.total || 0;

    const dataQuery = `
      SELECT 
        id,
        office_name AS "officeName",
        account_number AS "accountNumber",
        account_name AS "accountName",
        program_name AS "programName",
        activity_name AS "activityName",
        pagu_budget AS "paguBudget",
        used_budget AS "usedBudget",
        (pagu_budget - used_budget) AS "remainingBudget",
        ROUND(((pagu_budget - used_budget) / NULLIF(pagu_budget, 0)) * 100, 1) AS "remainingPercentage",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM master_budgets
      WHERE ${whereClause}
      ORDER BY account_number ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const dataRes = await this.pool.query(dataQuery, [
      ...queryParams,
      params.limit,
      offset,
    ]);

    return {
      totalData,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalData / params.limit) || 1,
      data: dataRes.rows,
    };
  }

  // 3. Ambil Detail Budget By ID
  async getBudgetById(id: string) {
    const query = `
      SELECT 
        id,
        office_name AS "officeName",
        account_number AS "accountNumber",
        account_name AS "accountName",
        program_name AS "programName",
        activity_name AS "activityName",
        pagu_budget AS "paguBudget",
        used_budget AS "usedBudget",
        (pagu_budget - used_budget) AS "remainingBudget",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM master_budgets
      WHERE id = $1;
    `;
    const res = await this.pool.query(query, [id]);
    return res.rows[0] || null;
  }

  // 4. Tambah Budget Baru
  async createBudget(dto: CreateBudgetDTO) {
    const query = `
      INSERT INTO master_budgets (
        office_name, account_number, account_name, program_name, activity_name, pagu_budget, used_budget
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, office_name AS "officeName", account_number AS "accountNumber", account_name AS "accountName",
        program_name AS "programName", activity_name AS "activityName", pagu_budget AS "paguBudget",
        used_budget AS "usedBudget", created_at AS "createdAt";
    `;
    const res = await this.pool.query(query, [
      dto.officeName,
      dto.accountNumber,
      dto.accountName,
      dto.programName,
      dto.activityName,
      dto.paguBudget,
      dto.usedBudget || 0.0,
    ]);
    return res.rows[0];
  }

  // 5. Update Budget
  async updateBudget(id: string, dto: UpdateBudgetDTO) {
    const query = `
      UPDATE master_budgets
      SET 
        office_name = COALESCE($1, office_name),
        account_number = COALESCE($2, account_number),
        account_name = COALESCE($3, account_name),
        program_name = COALESCE($4, program_name),
        activity_name = COALESCE($5, activity_name),
        pagu_budget = COALESCE($6, pagu_budget),
        used_budget = COALESCE($7, used_budget)
      WHERE id = $8
      RETURNING id;
    `;
    await this.pool.query(query, [
      dto.officeName,
      dto.accountNumber,
      dto.accountName,
      dto.programName,
      dto.activityName,
      dto.paguBudget,
      dto.usedBudget,
      id,
    ]);
    return this.getBudgetById(id);
  }

  // 6. Delete Budget
  async deleteBudget(id: string) {
    const res = await this.pool.query(
      `DELETE FROM master_budgets WHERE id = $1 RETURNING id;`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}