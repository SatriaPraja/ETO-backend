import { Pool } from "pg";
import { GetRecentOrdersQuery } from "../schemas/dashboardSchema.ts";

export class DashboardRepository {
  constructor(private pool: Pool) {}

  /**
   * Helper internal untuk membatasi klausa WHERE berdasarkan kriteria Role & Unit Kerja
   */
  private buildRoleScopeClause(
    userId: string,
    userRole: any,
    unitKerjaKodeUser?: string,
    queryParams: any[] = [],
  ) {
    // Normalisasi userRole ke bentuk Array<string> huruf kapital
    let rolesArray: string[] = [];

    if (Array.isArray(userRole)) {
      rolesArray = userRole.map((r) =>
        typeof r === "object"
          ? String(r.name || r.role || "").toUpperCase()
          : String(r).toUpperCase(),
      );
    } else if (typeof userRole === "string") {
      rolesArray = [userRole.toUpperCase()];
    } else if (userRole && typeof userRole === "object") {
      rolesArray = [String(userRole.name || userRole.role || "").toUpperCase()];
    }

    // 1. Check Global Admin Status
    const isGlobalAdmin = rolesArray.some((role) =>
      ["SUPER_ADMIN", "ADMIN_TRAVEL_KP", "ASDEP_KEUANGAN"].includes(role),
    );

    if (isGlobalAdmin) {
      // SUPER_ADMIN dapat melihat SELURUH data tanpa klausa pembatas
      return { whereClause: "1=1", queryParams };
    }

    // 2. Check Pejabat Penyetuju (Scope Unit Kerja)
    const isApprover = rolesArray.includes("APPROVER_KAKANWIL");
    if (isApprover && unitKerjaKodeUser) {
      queryParams.push(unitKerjaKodeUser);
      return {
        whereClause: `tro.unit_kerja_kode = $${queryParams.length}`,
        queryParams,
      };
    }

    // 3. User Biasa / Booker (Personal Scope)
    queryParams.push(userId);
    const userParamIdx = `$${queryParams.length}`;

    const personalClause = `(
    tro.booker_id = ${userParamIdx}
    OR tro.approver_id = ${userParamIdx}
    OR EXISTS (
      SELECT 1 FROM order_transports ot 
      WHERE ot.travel_order_id = tro.id AND ot.user_id = ${userParamIdx}
    )
    OR EXISTS (
      SELECT 1 FROM order_hotel_guests ohg 
      JOIN order_hotels oh ON ohg.order_hotel_id = oh.id
      WHERE oh.travel_order_id = tro.id AND ohg.user_id = ${userParamIdx}
    )
  )`;

    return { whereClause: personalClause, queryParams };
  }

  /**
   * 1. METRIK KPI COUNTER TOP BAR
   */
  async getKpiStats(
    userId: string,
    userRole: string | string[],
    unitKerjaKode?: string,
  ) {
    const { whereClause, queryParams } = this.buildRoleScopeClause(
      userId,
      userRole,
      unitKerjaKode,
    );

    const query = `
      SELECT
        COUNT(CASE WHEN tro.status = 'WAITING_PEJABAT' THEN 1 END)::INT AS "waitingCount",
        COUNT(
          CASE 
            WHEN tro.status = 'APPROVED' 
            AND DATE_TRUNC('month', tro.order_date) = DATE_TRUNC('month', CURRENT_DATE) 
            THEN 1 
          END
        )::INT AS "approvedThisMonthCount",
        COUNT(CASE WHEN tro.status = 'RETURNED' THEN 1 END)::INT AS "returnedCount",
        COUNT(CASE WHEN tro.status = 'REJECTED' THEN 1 END)::INT AS "rejectedCount"
      FROM travel_orders tro
      WHERE ${whereClause};
    `;

    const res = await this.pool.query(query, queryParams);
    return (
      res.rows[0] || {
        waitingCount: 0,
        approvedThisMonthCount: 0,
        returnedCount: 0,
        rejectedCount: 0,
      }
    );
  }

  /**
   * 2. DATA PERSONIL SEDANG BERLANGSUNG HARI INI
   */
  async getOngoingTravellers(
    userId: string,
    userRole: string | string[],
    unitKerjaKode?: string,
  ) {
    const { whereClause, queryParams } = this.buildRoleScopeClause(
      userId,
      userRole,
      unitKerjaKode,
    );

    const query = `
      SELECT 
        ot.id,
        ot.guest_name AS "guestName",
        ot.maskapai,
        ot.route_info AS "routeInfo",
        ot.departure_info AS "departureInfo",
        u.avatar_initials AS "avatarInitials"
      FROM order_transports ot
      JOIN travel_orders tro ON ot.travel_order_id = tro.id
      LEFT JOIN users u ON ot.user_id = u.id
      WHERE ${whereClause}
        AND tro.status = 'APPROVED'
        AND CURRENT_DATE BETWEEN ot.departure_date AND COALESCE(ot.return_date, ot.departure_date)
      ORDER BY ot.departure_time ASC
      LIMIT 10;
    `;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  /**
   * 3. RINGKASAN REALISASI ANGGARAN UNIT KERJA
   */
  async getBudgetSummary(unitKerjaKode?: string) {
    const query = `
      SELECT 
        COALESCE(SUM(pagu_budget), 0)::NUMERIC AS "paguTotal",
        COALESCE(SUM(used_budget), 0)::NUMERIC AS "realisasi",
        COALESCE(
          (
            SELECT SUM(total_estimated_cost) 
            FROM travel_orders 
            WHERE status = 'WAITING_PEJABAT'
              ${unitKerjaKode ? "AND unit_kerja_kode = $1" : ""}
          ), 0
        )::NUMERIC AS "pending",
        (
          COALESCE(SUM(pagu_budget), 0) - COALESCE(SUM(used_budget), 0)
        )::NUMERIC AS "sisa"
      FROM master_budgets
      ${unitKerjaKode ? "WHERE office_name ILIKE (SELECT unit_kerja_nama FROM users WHERE unit_kerja_kode = $1 LIMIT 1)" : ""};
    `;

    const params = unitKerjaKode ? [unitKerjaKode] : [];
    const res = await this.pool.query(query, params);
    const row = res.rows[0];

    const pagu = parseFloat(row?.paguTotal || "0");
    const realisasi = parseFloat(row?.realisasi || "0");
    const percentage = pagu > 0 ? Math.round((realisasi / pagu) * 100) : 0;

    return {
      paguTotal: pagu,
      realisasi,
      pending: parseFloat(row?.pending || "0"),
      sisa: parseFloat(row?.sisa || "0"),
      percentageTerpakai: percentage,
    };
  }

  /**
   * 4. DAFTAR PENGAJUAN TERAKHIR (RECENT ORDERS)
   */
  async getRecentOrders(
    userId: string,
    userRole: string | string[],
    filters: GetRecentOrdersQuery,
    unitKerjaKodeUser?: string,
  ) {
    const offset = (filters.page - 1) * filters.limit;
    const queryParams: any[] = [];

    const { whereClause: roleClause, queryParams: updatedParams } =
      this.buildRoleScopeClause(
        userId,
        userRole,
        unitKerjaKodeUser,
        queryParams,
      );

    const conditions: string[] = [roleClause];

    if (filters.search && filters.search.trim() !== "") {
      updatedParams.push(`%${filters.search.trim().toLowerCase()}%`);
      conditions.push(`(
        LOWER(tro.to_code) LIKE $${updatedParams.length}
        OR LOWER(tro.activity_name) LIKE $${updatedParams.length}
        OR LOWER(tro.sprin_number) LIKE $${updatedParams.length}
      )`);
    }

    if (filters.status && filters.status !== "ALL") {
      updatedParams.push(filters.status);
      conditions.push(`tro.status = $${updatedParams.length}`);
    }

    const fullWhereClause = conditions.join(" AND ");

    // Count Total
    const countQuery = `
      SELECT COUNT(tro.id)::INT AS total 
      FROM travel_orders tro 
      WHERE ${fullWhereClause};
    `;
    const countRes = await this.pool.query(countQuery, updatedParams);
    const totalData = countRes.rows[0]?.total || 0;

    // Data List
    updatedParams.push(filters.limit, offset);
    const limitIdx = updatedParams.length - 1;
    const offsetIdx = updatedParams.length;

    const dataQuery = `
      SELECT 
        tro.id,
        tro.to_code AS "toCode",
        tro.activity_name AS "activityName",
        tro.unit_kerja_kode AS "unitKerjaKode",
        tro.unit_kerja_nama AS "unitKerjaNama",
        tro.order_date AS "orderDate",
        tro.status,
        tro.total_estimated_cost AS "totalEstimatedCost",
        tro.created_at AS "createdAt",
        (
          SELECT COUNT(ot.id) 
          FROM order_transports ot 
          WHERE ot.travel_order_id = tro.id
        ) AS "totalTravellers"
      FROM travel_orders tro
      WHERE ${fullWhereClause}
      ORDER BY tro.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const dataRes = await this.pool.query(dataQuery, updatedParams);

    return {
      items: dataRes.rows,
      meta: {
        totalData,
        currentPage: filters.page,
        totalPages: Math.ceil(totalData / filters.limit) || 1,
        limit: filters.limit,
      },
    };
  }
}
